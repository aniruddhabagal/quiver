"""In-process pub/sub, one queue per connected WebSocket. Single process by design."""

from __future__ import annotations

import asyncio
import json
from collections import defaultdict
from typing import Any

from .ids import iso, now


class Broadcaster:
    def __init__(self) -> None:
        self._queues: dict[str, set[asyncio.Queue[str]]] = defaultdict(set)

    def subscribe(self, user_id: str) -> asyncio.Queue[str]:
        q: asyncio.Queue[str] = asyncio.Queue(maxsize=200)
        self._queues[user_id].add(q)
        return q

    def unsubscribe(self, user_id: str, q: asyncio.Queue[str]) -> None:
        self._queues[user_id].discard(q)
        if not self._queues[user_id]:
            del self._queues[user_id]

    async def publish(self, user_id: str, type_: str, payload: dict[str, Any]) -> None:
        if user_id not in self._queues:
            return
        message = json.dumps({"type": type_, "ts": iso(now()), "payload": payload}, default=str)
        for q in list(self._queues[user_id]):
            if q.full():
                try:
                    q.get_nowait()
                except asyncio.QueueEmpty:
                    pass
            q.put_nowait(message)

    def connections(self) -> int:
        return sum(len(v) for v in self._queues.values())


broadcaster = Broadcaster()
