"""Where a held call waits. Phase 6 replaces this with the approval inbox."""

from __future__ import annotations

from typing import Any, Literal, Protocol

HoldOutcome = Literal["approved", "denied", "expired"]


class HoldHandler(Protocol):
    async def hold(
        self,
        db: Any,
        call: dict[str, Any],
        loadout: dict[str, Any],
        spec: dict[str, Any],
        args_redacted: dict[str, Any],
    ) -> tuple[HoldOutcome, str | None, str | None]:
        """Returns (outcome, approval_id, reason)."""


class NoApprovals:
    async def hold(
        self,
        db: Any,
        call: dict[str, Any],
        loadout: dict[str, Any],
        spec: dict[str, Any],
        args_redacted: dict[str, Any],
    ) -> tuple[HoldOutcome, str | None, str | None]:
        return (
            "denied",
            None,
            "Quiver: this tool requires human approval, and approvals are not enabled on this server yet.",
        )
