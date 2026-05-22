from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections, presence tracking, and room messaging."""

    def __init__(self) -> None:
        # user_id -> WebSocket (master presence channel)
        self._online: dict[str, WebSocket] = {}
        # user_id -> username
        self._usernames: dict[str, str] = {}
        # room_id -> set of user_ids currently subscribed
        self._rooms: dict[str, set[str]] = {}
        # user_id -> WebSocket for room chat
        self._room_sockets: dict[str, WebSocket] = {}
        self._lock = asyncio.Lock()

    # ---- Presence (master /ws/online) ----

    async def connect_presence(self, user_id: str, username: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._online[user_id] = ws
            self._usernames[user_id] = username
        await self._broadcast_online_list()

    async def disconnect_presence(self, user_id: str) -> None:
        async with self._lock:
            self._online.pop(user_id, None)
            self._usernames.pop(user_id, None)
            # Remove from all rooms
            for members in self._rooms.values():
                members.discard(user_id)
            self._room_sockets.pop(user_id, None)
        await self._broadcast_online_list()

    async def _broadcast_online_list(self) -> None:
        payload = json.dumps({
            "type": "online_users",
            "data": [
                {"user_id": uid, "username": uname}
                for uid, uname in self._usernames.items()
            ],
        })
        stale: list[str] = []
        async with self._lock:
            sockets = list(self._online.items())
        for uid, ws in sockets:
            try:
                await ws.send_text(payload)
            except Exception:
                stale.append(uid)
        for uid in stale:
            await self.disconnect_presence(uid)

    def is_online(self, user_id: str) -> bool:
        return user_id in self._online

    # ---- Room / Chat ----

    async def join_room(self, room_id: str, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        async with self._lock:
            self._rooms.setdefault(room_id, set()).add(user_id)
            self._room_sockets[user_id] = ws

    async def leave_room(self, room_id: str, user_id: str) -> None:
        async with self._lock:
            if room_id in self._rooms:
                self._rooms[room_id].discard(user_id)
            self._room_sockets.pop(user_id, None)

    async def broadcast_to_room(self, room_id: str, payload: dict[str, Any]) -> None:
        text = json.dumps(payload)
        async with self._lock:
            members = list(self._rooms.get(room_id, set()))
        for uid in members:
            ws = self._room_sockets.get(uid)
            if ws:
                try:
                    await ws.send_text(text)
                except Exception:
                    logger.warning("Failed to send to %s in room %s", uid, room_id)

    # ---- WebRTC Signaling (relayed via master ws) ----

    async def relay_to_user(self, target_user_id: str, payload: dict[str, Any]) -> bool:
        ws = self._online.get(target_user_id)
        if ws is None:
            return False
        try:
            await ws.send_text(json.dumps(payload))
            return True
        except Exception:
            return False


manager = ConnectionManager()
