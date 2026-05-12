from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict


class CreateTeamProjectCommand(BaseModel):
    model_config = ConfigDict(frozen=True)

    name: str
    dir_path: str
    team_config: dict[str, Any]
