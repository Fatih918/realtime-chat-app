from __future__ import annotations

import json
import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from database import close_db, connect_db, get_db
from managers import manager
from schemas import (
    MessageCreate,
    MessageOut,
    RoomCreate,
    RoomOut,
    UserCreate,
    UserOut,
)

logger = logging.getLogger(__name__)


# ---------- Lifespan ----------
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    await connect_db()
    yield
    await close_db()


app = FastAPI(title="Realtime Chat & Call", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_user_by_token(token: str) -> dict | None:
    db = get_db()
    return await db.users.find_one({"session_token": token})


# ---------- REST: Auth ----------
@app.post("/api/auth/register", response_model=UserOut)
async def register(body: UserCreate):
    db = get_db()
    user_id = uuid.uuid4().hex[:16]
    session_token = uuid.uuid4().hex
    doc = {
        "user_id": user_id,
        "username": body.username,
        "session_token": session_token,
        "created_at": _now_iso(),
    }
    await db.users.insert_one(doc)
    return UserOut(user_id=user_id, username=body.username, session_token=session_token)


# ---------- REST: Rooms ----------
@app.post("/api/rooms", response_model=RoomOut)
async def create_room(body: RoomCreate, token: str = Query(...)):
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "Invalid token")
    db = get_db()
    member_ids = list(set(body.member_ids + [user["user_id"]]))
    is_group = len(member_ids) > 2
    room_id = uuid.uuid4().hex[:16]

    # For DMs, check if a room already exists between these two users
    if not is_group and len(member_ids) == 2:
        existing = await db.rooms.find_one({
            "is_group": False,
            "member_ids": {"$all": member_ids, "$size": 2},
        })
        if existing:
            return RoomOut(
                id=existing["room_id"],
                name=existing.get("name", ""),
                is_group=False,
                member_ids=existing["member_ids"],
                created_at=existing["created_at"],
            )

    doc = {
        "room_id": room_id,
        "name": body.name,
        "is_group": is_group,
        "member_ids": member_ids,
        "created_at": _now_iso(),
    }
    await db.rooms.insert_one(doc)
    return RoomOut(id=room_id, name=body.name, is_group=is_group, member_ids=member_ids, created_at=doc["created_at"])


@app.get("/api/rooms", response_model=list[RoomOut])
async def list_rooms(token: str = Query(...)):
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "Invalid token")
    db = get_db()
    cursor = db.rooms.find({"member_ids": user["user_id"]})
    rooms: list[RoomOut] = []
    async for r in cursor:
        rooms.append(
            RoomOut(
                id=r["room_id"],
                name=r.get("name", ""),
                is_group=r["is_group"],
                member_ids=r["member_ids"],
                created_at=r["created_at"],
            )
        )
    return rooms


# ---------- REST: Messages ----------
@app.get("/api/rooms/{room_id}/messages", response_model=list[MessageOut])
async def get_messages(room_id: str, token: str = Query(...), limit: int = 100):
    user = await _get_user_by_token(token)
    if not user:
        raise HTTPException(401, "Invalid token")
    db = get_db()
    cursor = db.messages.find({"room_id": room_id}).sort("timestamp", -1).limit(limit)
    msgs: list[MessageOut] = []
    async for m in cursor:
        msgs.append(
            MessageOut(
                id=m["message_id"],
                room_id=m["room_id"],
                sender_id=m["sender_id"],
                sender_name=m["sender_name"],
                content=m["content"],
                timestamp=m["timestamp"],
            )
        )
    msgs.reverse()
    return msgs


# ---------- WebSocket: Master Presence ----------
@app.websocket("/ws/online")
async def ws_online(ws: WebSocket, token: str = Query(...)):
    user = await _get_user_by_token(token)
    if not user:
        await ws.close(code=4001, reason="Invalid token")
        return

    user_id: str = user["user_id"]
    username: str = user["username"]
    await manager.connect_presence(user_id, username, ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")

            # WebRTC signaling relay
            if msg_type in (
                "rtc_offer",
                "rtc_answer",
                "rtc_ice_candidate",
                "rtc_call_request",
                "rtc_call_response",
                "rtc_hangup",
            ):
                target = msg.get("target_user_id")
                if target:
                    msg["from_user_id"] = user_id
                    msg["from_username"] = username
                    await manager.relay_to_user(target, msg)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Presence WS error for %s", user_id)
    finally:
        await manager.disconnect_presence(user_id)


# ---------- WebSocket: Room Chat ----------
@app.websocket("/ws/room/{room_id}")
async def ws_room(ws: WebSocket, room_id: str, token: str = Query(...)):
    user = await _get_user_by_token(token)
    if not user:
        await ws.close(code=4001, reason="Invalid token")
        return

    user_id: str = user["user_id"]
    username: str = user["username"]
    db = get_db()

    room = await db.rooms.find_one({"room_id": room_id})
    if not room or user_id not in room["member_ids"]:
        await ws.close(code=4003, reason="Not a member")
        return

    await manager.join_room(room_id, user_id, ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                continue

            if msg.get("type") == "chat_message":
                content = msg.get("content", "").strip()
                if not content:
                    continue
                message_id = uuid.uuid4().hex[:16]
                ts = _now_iso()
                doc = {
                    "message_id": message_id,
                    "room_id": room_id,
                    "sender_id": user_id,
                    "sender_name": username,
                    "content": content,
                    "timestamp": ts,
                }
                await db.messages.insert_one(doc)
                await manager.broadcast_to_room(room_id, {
                    "type": "chat_message",
                    "data": {
                        "id": message_id,
                        "room_id": room_id,
                        "sender_id": user_id,
                        "sender_name": username,
                        "content": content,
                        "timestamp": ts,
                    },
                })
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Room WS error for %s in %s", user_id, room_id)
    finally:
        await manager.leave_room(room_id, user_id)
