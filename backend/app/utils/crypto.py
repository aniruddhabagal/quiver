"""Upstream credentials at rest: Fernet keyed from the app secret via HKDF."""

import base64
import json
from functools import lru_cache
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

from ..config import settings


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    key = HKDF(algorithm=hashes.SHA256(), length=32, salt=b"quiver", info=b"upstream-auth").derive(
        settings.encryption_secret.encode()
    )
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_json(value: Any) -> str:
    return _fernet().encrypt(json.dumps(value).encode()).decode()


def decrypt_json(blob: str | None) -> Any:
    if not blob:
        return None
    try:
        return json.loads(_fernet().decrypt(blob.encode()))
    except (InvalidToken, ValueError):
        return None
