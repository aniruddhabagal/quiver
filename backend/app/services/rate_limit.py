"""Sliding-window limiter, per (loadout, tool). In memory: this is a single-process service."""

from __future__ import annotations

import time
from collections import deque
from collections.abc import Callable

from .policy import RateState


class SlidingWindow:
    def __init__(self, clock: Callable[[], float] = time.monotonic):
        self._clock = clock
        self._hits: dict[tuple[str, str], deque[float]] = {}

    def check_and_record(self, key: tuple[str, str], limit: int | None, window_s: float = 60.0) -> RateState:
        if not limit:
            return RateState(True, 0.0)
        now = self._clock()
        q = self._hits.setdefault(key, deque())
        while q and now - q[0] >= window_s:
            q.popleft()
        if len(q) >= limit:
            return RateState(False, window_s - (now - q[0]))
        q.append(now)
        return RateState(True, 0.0)

    def reset(self) -> None:
        self._hits.clear()
