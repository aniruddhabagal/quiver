"""Redaction rules run on stored arguments, on anything we display or forward to Slack,
and on text results before they return to the agent. Never on the arguments sent upstream."""

from __future__ import annotations

import re
from functools import lru_cache
from typing import Any

Rule = tuple[re.Pattern[str], str]


@lru_cache(maxsize=512)
def _compile(pattern: str) -> re.Pattern[str]:
    return re.compile(pattern)


def compile_rules(rules: list[dict[str, Any]] | None) -> list[Rule]:
    out: list[Rule] = []
    for r in rules or []:
        pattern = r.get("pattern")
        if not pattern:
            continue
        try:
            out.append((_compile(pattern), r.get("replacement") or "••••"))
        except re.error:
            continue
    return out


def redact_text(text: str, rules: list[Rule]) -> str:
    for pattern, replacement in rules:
        text = pattern.sub(replacement, text)
    return text


def redact_obj(value: Any, rules: list[Rule]) -> Any:
    if not rules:
        return value
    if isinstance(value, str):
        return redact_text(value, rules)
    if isinstance(value, list):
        return [redact_obj(v, rules) for v in value]
    if isinstance(value, dict):
        return {k: redact_obj(v, rules) for k, v in value.items()}
    return value


def redact_result(result: dict[str, Any], rules: list[Rule]) -> dict[str, Any]:
    if not rules:
        return result
    out = dict(result)
    content = []
    for item in result.get("content") or []:
        if isinstance(item, dict) and item.get("type") == "text" and isinstance(item.get("text"), str):
            content.append({**item, "text": redact_text(item["text"], rules)})
        else:
            content.append(item)
    out["content"] = content
    if "structuredContent" in result:
        out["structuredContent"] = redact_obj(result["structuredContent"], rules)
    return out
