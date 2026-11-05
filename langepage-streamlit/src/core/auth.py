"""Who is using the app (R5). GKE/Titan: the corporate Ingress Gateway injects the user in HTTP headers
(x-user-id / x-user-email) and the BFF keeps the session cookie; no st.login, nothing in browser storage."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import streamlit as st

from core.settings import settings


@dataclass(frozen=True)
class User:
    user_id: Optional[str]
    email: Optional[str]
    first_name: Optional[str]


def _first_name_from_email(email: Optional[str]) -> Optional[str]:
    if not email or "@" not in email:
        return None
    local = email.split("@", 1)[0].split(".")[0]
    return local if local.isalpha() else None


def current_user() -> User:
    cfg = settings()["auth"]
    mode = cfg["mode"]
    if mode in ("none", "mock"):
        return User(None, None, cfg.get("mock_first_name") if mode == "mock" else None)
    try:
        headers = st.context.headers
    except Exception:  # bare mode / tests
        headers = {}
    user_id = headers.get(cfg["user_id_header"])
    email = headers.get(cfg["user_email_header"])
    return User(user_id, email, _first_name_from_email(email))


def forward_headers() -> dict:
    """Headers repeated on calls to the BFF so it sees the same user (cookie/JWT handling stays in the gateway)."""
    try:
        headers = st.context.headers
    except Exception:
        return {}
    keep = {"authorization", "cookie", settings()["auth"]["user_id_header"], settings()["auth"]["user_email_header"]}
    return {k: v for k, v in headers.items() if k.lower() in keep}
