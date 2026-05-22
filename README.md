# ChatCall — Real-Time Chat & Video/Audio Call App

A mobile-optimized real-time chat and WebRTC video/audio calling application with automatic online presence detection.

## Tech Stack

- **Backend:** FastAPI (Python) with WebSockets
- **Database:** MongoDB (chat history & profiles) + In-Memory State (presence tracking)
- **Frontend:** Next.js 16 + React 19 + Tailwind CSS v4 + WebRTC API

## Features

- **One-Click Anonymous Auth:** Enter a username and get an instant session token
- **Auto-Presence:** WebSocket-based online user detection with real-time broadcast
- **1-on-1 DM:** Click any online user to instantly create a chat room
- **WebRTC Video/Audio Calls:** Peer-to-peer calling via WebSocket signaling
- **Mobile-First Responsive:** Portrait/Landscape adaptive layouts using `100dvh` and orientation media queries
- **Adaptive Video Grid:** Portrait shows PiP overlay; Landscape shows split-screen grid

## Project Structure

```
backend/
  main.py              # FastAPI app, REST endpoints, WebSocket handlers
  database.py          # MongoDB connection (Motor async driver)
  managers.py          # ConnectionManager for WebSocket presence & rooms
  schemas.py           # Pydantic models

frontend/src/
  app/
    globals.css        # Tailwind v4 + orientation-adaptive call grid CSS
    layout.tsx         # Root layout with 100dvh viewport
    page.tsx           # App entry point with auth/ws providers
  lib/
    auth.tsx           # Auth context & anonymous registration
    constants.ts       # API/WS base URLs
    websocket.tsx      # WebSocket provider & master presence connection
  hooks/
    useOnlineUsers.ts  # Hook for syncing online users list
    useWebRTC.ts       # WebRTC PeerConnection, streams, signaling logic
  components/
    LoginScreen.tsx    # Username entry screen
    ChatApp.tsx        # Main app shell with sidebar/chat/call layout
    chat/
      Sidebar.tsx      # Online users list, room selection
      ChatWindow.tsx   # Chat messages, input, per-room WebSocket
    call/
      CallOverlay.tsx  # Video call overlay with adaptive CSS grid
      CallControls.tsx # Mute, camera toggle, end call buttons
      IncomingCallModal.tsx  # Incoming call accept/reject modal
```

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- MongoDB running on `localhost:27017`

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

### Docker Compose

```bash
docker compose up --build
```

## Mobile Responsiveness

- **Portrait (9:16):** Sidebar and ChatWindow toggle via slide — only one visible at a time
- **Landscape / Desktop:** Split-view with sidebar (w-80) and chat side-by-side
- **Video Call Portrait:** Remote video fills screen, local video floats as PiP
- **Video Call Landscape:** Side-by-side grid with equal sizing
- Uses `h-[100dvh]` to handle mobile browser chrome (Safari iOS, Chrome Android)
- Touch highlight disabled via `-webkit-tap-highlight-color: transparent`
