from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from application.memory.claude_md_revision_application_service import ClaudeMdRevisionApplicationService
from application.memory.memory_file_application_service import MemoryFileApplicationService
from application.memory.rule_file_application_service import RuleFileApplicationService
from domain.memory.model.claude_md_revision import ClaudeMdRevision
from domain.shared.business_exception import BusinessException
from ohs.dependencies import (
    get_claude_md_revision_application_service,
    get_memory_file_application_service,
    get_rule_file_application_service,
)
from ohs.http.api_response import ApiResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/memory", tags=["Memory"])

ClaudeMdRevisionServiceDep = Annotated[
    ClaudeMdRevisionApplicationService,
    Depends(get_claude_md_revision_application_service),
]

MemoryFileServiceDep = Annotated[
    MemoryFileApplicationService,
    Depends(get_memory_file_application_service),
]

RuleFileServiceDep = Annotated[
    RuleFileApplicationService,
    Depends(get_rule_file_application_service),
]


class MemoryFileWrite(BaseModel):
    project_dir: str
    content: str


class RuleFileWrite(BaseModel):
    project_dir: str
    content: str = ""
    paths: list[str] = []


class ClaudeMdDraftRequest(BaseModel):
    project_dir: str
    content: str
    base_revision_id: str = ""


class ClaudeMdUpdateRequest(BaseModel):
    content: str


class ClaudeMdRejectRequest(BaseModel):
    reason: str = ""


class ClaudeMdApplyRequest(BaseModel):
    project_dir: str
    expected_base_revision_id: str
    expected_file_hash: str


def _revision_to_dict(revision: ClaudeMdRevision) -> dict:
    return ClaudeMdRevisionApplicationService._revision_to_dict(revision)


@router.get("/claude-md")
async def read_claude_md(
    service: ClaudeMdRevisionServiceDep,
    project_dir: str = Query(...),
):
    """Read project CLAUDE.md and initialize revision history if needed."""
    data = await service.read_current(project_dir)
    return ApiResponse.success(data=data)


@router.put("/claude-md")
async def write_claude_md(
    body: MemoryFileWrite,
    service: ClaudeMdRevisionServiceDep,
):
    """Create a draft revision for project CLAUDE.md without writing the file."""
    revision = await service.create_draft(body.project_dir, body.content)
    logger.info("CLAUDE.md draft created: %s", revision.id)
    return ApiResponse.success(data={"revision": _revision_to_dict(revision)})


@router.get("/claude-md/versions")
async def list_claude_md_versions(
    service: ClaudeMdRevisionServiceDep,
    project_dir: str = Query(...),
):
    revisions = await service.list_versions(project_dir)
    return ApiResponse.success(data={"versions": [_revision_to_dict(r) for r in revisions]})


@router.post("/claude-md/drafts")
async def create_claude_md_draft(
    body: ClaudeMdDraftRequest,
    service: ClaudeMdRevisionServiceDep,
):
    revision = await service.create_draft(
        project_dir=body.project_dir,
        content=body.content,
        base_revision_id=body.base_revision_id,
    )
    return ApiResponse.success(data={"revision": _revision_to_dict(revision)})


@router.patch("/claude-md/revisions/{revision_id}")
async def update_claude_md_revision(
    revision_id: str,
    body: ClaudeMdUpdateRequest,
    service: ClaudeMdRevisionServiceDep,
):
    revision = await service.update_revision(revision_id, body.content)
    return ApiResponse.success(data={"revision": _revision_to_dict(revision)})


@router.post("/claude-md/revisions/{revision_id}/propose")
async def propose_claude_md_revision(
    revision_id: str,
    service: ClaudeMdRevisionServiceDep,
):
    revision = await service.propose(revision_id)
    return ApiResponse.success(data={"revision": _revision_to_dict(revision)})


@router.post("/claude-md/revisions/{revision_id}/approve")
async def approve_claude_md_revision(
    revision_id: str,
    service: ClaudeMdRevisionServiceDep,
):
    revision = await service.approve(revision_id)
    return ApiResponse.success(data={"revision": _revision_to_dict(revision)})


@router.post("/claude-md/revisions/{revision_id}/reject")
async def reject_claude_md_revision(
    revision_id: str,
    body: ClaudeMdRejectRequest,
    service: ClaudeMdRevisionServiceDep,
):
    revision = await service.reject(revision_id, body.reason)
    return ApiResponse.success(data={"revision": _revision_to_dict(revision)})


@router.post("/claude-md/revisions/{revision_id}/apply")
async def apply_claude_md_revision(
    revision_id: str,
    body: ClaudeMdApplyRequest,
    service: ClaudeMdRevisionServiceDep,
):
    result = await service.apply(
        revision_id=revision_id,
        project_dir=body.project_dir,
        expected_base_revision_id=body.expected_base_revision_id,
        expected_file_hash=body.expected_file_hash,
    )
    data = {
        "revision": _revision_to_dict(result.revision),
        "conflict": result.conflict,
        "current_file_hash": result.current_file_hash,
    }
    if result.conflict:
        return ApiResponse.success(data=data, message="CLAUDE.md has changed on disk")
    return ApiResponse.success(data=data)


@router.delete("/claude-md/revisions/{revision_id}")
async def delete_claude_md_revision(
    revision_id: str,
    service: ClaudeMdRevisionServiceDep,
):
    await service.delete_revision(revision_id)
    return ApiResponse.success()


@router.get("/claude-md/revisions/{revision_id}/diff")
async def diff_claude_md_revision(
    revision_id: str,
    service: ClaudeMdRevisionServiceDep,
):
    return ApiResponse.success(data=await service.diff_revision(revision_id))


@router.get("/rules")
async def list_rules(
    service: RuleFileServiceDep,
    project_dir: str = Query(...),
):
    rules = await service.list_rules(project_dir)
    return ApiResponse.success(data={"rules": rules})


@router.get("/rules/{rule_path:path}")
async def read_rule(
    rule_path: str,
    service: RuleFileServiceDep,
    project_dir: str = Query(...),
):
    try:
        rule = await service.read_rule(project_dir, rule_path)
    except BusinessException as e:
        return ApiResponse.fail(code=-1, message=str(e))
    return ApiResponse.success(data={"rule": rule})


@router.put("/rules/{rule_path:path}")
async def write_rule(rule_path: str, body: RuleFileWrite, service: RuleFileServiceDep):
    try:
        rule = await service.write_rule(body.project_dir, rule_path, body.content, body.paths)
    except BusinessException as e:
        return ApiResponse.fail(code=-1, message=str(e))
    logger.info("Rule file written: %s", rule_path)
    return ApiResponse.success(data={"rule": rule})


@router.delete("/rules/{rule_path:path}")
async def delete_rule(
    rule_path: str,
    service: RuleFileServiceDep,
    project_dir: str = Query(...),
):
    try:
        deleted_path = await service.delete_rule(project_dir, rule_path)
    except BusinessException as e:
        return ApiResponse.fail(code=-1, message=str(e))
    logger.info("Rule file deleted: %s", rule_path)
    return ApiResponse.success(data={"path": deleted_path})


@router.get("")
async def list_memory_files(
    service: MemoryFileServiceDep,
    project_dir: str = Query(...),
):
    """List all memory files with preview."""
    data = await service.list_files(project_dir)
    return ApiResponse.success(data=data)


@router.get("/index")
async def read_index(
    service: MemoryFileServiceDep,
    project_dir: str = Query(...),
):
    """Read MEMORY.md index file."""
    content = await service.read_index(project_dir)
    return ApiResponse.success(data={"content": content})


@router.get("/{filename}")
async def read_memory_file(
    filename: str,
    service: MemoryFileServiceDep,
    project_dir: str = Query(...),
):
    """Read a specific memory file."""
    try:
        data = await service.read_file(project_dir, filename)
    except BusinessException as e:
        return ApiResponse.fail(code=-1, message=str(e))
    return ApiResponse.success(data=data)


@router.put("/{filename}")
async def write_memory_file(filename: str, body: MemoryFileWrite, service: MemoryFileServiceDep):
    """Create or update a memory file."""
    try:
        data = await service.write_file(body.project_dir, filename, body.content)
    except BusinessException as e:
        return ApiResponse.fail(code=-1, message=str(e))
    logger.info("Memory file written: %s/%s", body.project_dir, filename)
    return ApiResponse.success(data=data)


@router.put("/index/update")
async def write_index(body: MemoryFileWrite, service: MemoryFileServiceDep):
    """Update MEMORY.md index file."""
    try:
        data = await service.write_index(body.project_dir, body.content)
    except BusinessException as e:
        return ApiResponse.fail(code=-1, message=str(e))
    return ApiResponse.success(data=data)


@router.delete("/{filename}")
async def delete_memory_file(
    filename: str,
    service: MemoryFileServiceDep,
    project_dir: str = Query(...),
):
    """Delete a memory file."""
    try:
        data = await service.delete_file(project_dir, filename)
    except BusinessException as e:
        return ApiResponse.fail(code=-1, message=str(e))
    logger.info("Memory file deleted: %s/%s", project_dir, filename)
    return ApiResponse.success(data=data)
