import asyncio
from dataclasses import dataclass, field
from typing import Any
from fastapi import WebSocket


@dataclass
class Client:
    id: str
    name: str
    color: str
    websocket: WebSocket


@dataclass
class Room:
    id: str
    # Full operation log — new clients replay this to rebuild state
    ops: list[dict] = field(default_factory=list)
    clients: dict[str, Client] = field(default_factory=dict)


class RoomManager:
    def __init__(self):
        self._rooms: dict[str, Room] = {}
        self._lock = asyncio.Lock()

    def _get_or_create(self, room_id: str) -> Room:
        if room_id not in self._rooms:
            self._rooms[room_id] = Room(id=room_id)
        return self._rooms[room_id]

    async def connect(self, room_id: str, client: Client):
        async with self._lock:
            room = self._get_or_create(room_id)
            room.clients[client.id] = client
            # Send full op log so client can reconstruct current state
            await client.websocket.send_json({
                "type": "INIT",
                "ops": room.ops,
                "peers": [
                    {"id": c.id, "name": c.name, "color": c.color}
                    for c in room.clients.values()
                    if c.id != client.id
                ],
            })
            # Notify others of new peer
            await self._broadcast(room, {
                "type": "PEER_JOINED",
                "peer": {"id": client.id, "name": client.name, "color": client.color},
            }, exclude=client.id)

    async def disconnect(self, room_id: str, client_id: str):
        async with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                return
            room.clients.pop(client_id, None)
            await self._broadcast(room, {"type": "PEER_LEFT", "clientId": client_id})
            if not room.clients:
                del self._rooms[room_id]

    async def handle_op(self, room_id: str, op: dict):
        async with self._lock:
            room = self._rooms.get(room_id)
            if not room:
                return
            # Cursor moves are ephemeral — don't persist them
            if op.get("type") != "CURSOR_MOVE":
                room.ops.append(op)
            await self._broadcast(room, op, exclude=op.get("clientId"))

    async def _broadcast(self, room: Room, message: dict, exclude: str | None = None):
        dead = []
        for client in room.clients.values():
            if client.id == exclude:
                continue
            try:
                await client.websocket.send_json(message)
            except Exception:
                dead.append(client.id)
        for cid in dead:
            room.clients.pop(cid, None)


manager = RoomManager()
