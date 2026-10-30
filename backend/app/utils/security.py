import base64
import hashlib
from typing import Optional


def encrypt_value(value: str) -> str:
    digest = hashlib.sha256(value.encode("utf-8")).hexdigest()
    return base64.b64encode(digest.encode("utf-8")).decode("utf-8")


def decrypt_value(value: str) -> str:
    return base64.b64decode(value.encode("utf-8")).decode("utf-8")
