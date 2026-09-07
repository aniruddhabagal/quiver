"""Decides what happens to one tool call. Pure: data in, decision out."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

Action = Literal["allow", "hold", "deny"]
Reason = Literal["disabled", "policy_deny", "rate_limited", "policy_approve", "policy_allow"]


@dataclass(frozen=True)
class RateState:
    allowed: bool
    retry_after_s: float


@dataclass(frozen=True)
class Decision:
    action: Action
    reason: Reason
    message: str
    retry_after_s: float | None = None


def evaluate(spec: dict[str, Any], rate: RateState | None) -> Decision:
    policy = spec.get("policy") or {}
    alias = spec.get("alias", "?")
    if not spec.get("enabled", True):
        return Decision("deny", "disabled", f"Quiver: tool {alias} is disabled in this loadout")
    mode = policy.get("mode", "allow")
    if mode == "deny":
        return Decision(
            "deny",
            "policy_deny",
            f"Quiver: denied by policy 'deny' on tool {alias}. This tool is visible but cannot be called.",
        )
    if rate is not None and not rate.allowed:
        limit = policy.get("rate_limit_per_min")
        return Decision(
            "deny",
            "rate_limited",
            f"Quiver: rate limit of {limit} per minute reached for {alias}. Retry in {int(rate.retry_after_s) + 1} s.",
            retry_after_s=rate.retry_after_s,
        )
    if mode == "approve":
        return Decision("hold", "policy_approve", f"Quiver: {alias} requires human approval")
    return Decision("allow", "policy_allow", "policy allow")
