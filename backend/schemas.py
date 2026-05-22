from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


# ---------- User ----------
class UserCreate(BaseModel):
    username: str = Field(..., min_length=1, max_length=40)


class UserOut(BaseModel):
    user_id: str
    username: str
    session_token: str


# ---------- Message ----------
class MessageOut(BaseModel):
    id: str
    room_id: str
    sender_id: str
    sender_name: str
    content: str
    timestamp: str


class MessageCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=4000)


# ---------- Room ----------
class RoomCreate(BaseModel):
    name: str = Field("", max_length=80)
    member_ids: list[str] = Field(default_factory=list)


class RoomOut(BaseModel):
    id: str
    name: str
    is_group: bool
    member_ids: list[str]
    created_at: str


# ---------- WebSocket Payloads ----------
class WSPayload(BaseModel):
    type: str
    data: dict = Field(default_factory=dict)


# WebRTC signaling payload types
class RTCOffer(BaseModel):
    type: Literal["rtc_offer"] = "rtc_offer"
    target_user_id: str
    sdp: str


class RTCAnswer(BaseModel):
    type: Literal["rtc_answer"] = "rtc_answer"
    target_user_id: str
    sdp: str


class RTCIceCandidate(BaseModel):
    type: Literal["rtc_ice_candidate"] = "rtc_ice_candidate"
    target_user_id: str
    candidate: dict


class RTCCallRequest(BaseModel):
    type: Literal["rtc_call_request"] = "rtc_call_request"
    target_user_id: str
    call_type: Literal["audio", "video"] = "video"


class RTCCallResponse(BaseModel):
    type: Literal["rtc_call_response"] = "rtc_call_response"
    target_user_id: str
    accepted: bool


class RTCHangup(BaseModel):
    type: Literal["rtc_hangup"] = "rtc_hangup"
    target_user_id: str
