from __future__ import annotations

import json


def safe_json_loads(s: str | None, default=None):
    if default is None:
        default = {}
    if not s:
        return default
    try:
        return json.loads(s)
    except (json.JSONDecodeError, TypeError):
        return default
