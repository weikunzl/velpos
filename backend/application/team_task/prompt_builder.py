from __future__ import annotations

from typing import Any


def build_coordinator_system_prompt(project: Any) -> str:
    """Build the system prompt for a team coordinator session."""
    config = project.team_config
    mode = config.get("mode", "delegation")
    team_name = project.name

    if mode == "delegation":
        return _build_delegation_prompt(team_name, config)
    return _build_collaboration_prompt(team_name, config)


def _build_delegation_prompt(team_name: str, config: dict[str, Any]) -> str:
    pipeline = config.get("pipeline", [])
    steps_desc = []
    for i, step in enumerate(pipeline):
        role = step.get("role", "")
        label = step.get("role_label", role)
        handoff_input = step.get("handoff_input", "")
        handoff_output = step.get("handoff_output", "")
        desc = f"  Step {i + 1}: {label} (role={role})"
        if handoff_input:
            desc += f"\n    Input: {handoff_input}"
        if handoff_output:
            desc += f"\n    Output: {handoff_output}"
        steps_desc.append(desc)

    pipeline_text = "\n".join(steps_desc) if steps_desc else "  (no steps configured)"

    return f"""You are the coordinator for team "{team_name}" running in DELEGATION mode.

Your job is to break down the user's request and execute it through a sequential pipeline of specialized agents.

## Pipeline
{pipeline_text}

## How to work
1. When the user gives you a task, analyze it and determine what each pipeline step needs to do.
2. Use the `team_dispatch` tool to delegate work to each step IN ORDER (Step 1 first, then Step 2, etc.).
3. Pass the output of each step as context to the next step.
4. If multiple steps are INDEPENDENT (no data dependency between them), use `team_dispatch_batch` to run them in parallel.
5. After all steps complete, synthesize the results and present a summary to the user.

## Rules
- Always execute steps in order unless they are truly independent.
- Pass relevant output from previous steps to subsequent steps via the `context` parameter.
- If a step fails, report the error and stop the pipeline (do not continue to the next step).
- Use `team_task_status` to check the status of dispatched tasks if needed.
- Present a clear summary of the overall result when the pipeline completes.
"""


def _build_collaboration_prompt(team_name: str, config: dict[str, Any]) -> str:
    members = config.get("members", [])
    default_workflow = config.get("default_workflow", [])
    max_depth = config.get("max_depth", 5)

    members_desc = []
    for m in members:
        role = m.get("role", "")
        label = m.get("role_label", role)
        trigger = m.get("trigger", "")
        provides = m.get("provides", "")
        desc = f"  - {label} (role={role})"
        if trigger:
            desc += f"\n    When to invoke: {trigger}"
        if provides:
            desc += f"\n    Provides: {provides}"
        members_desc.append(desc)

    members_text = "\n".join(members_desc) if members_desc else "  (no members configured)"
    workflow_text = " → ".join(default_workflow) if default_workflow else "(no default workflow)"

    return f"""You are the coordinator for team "{team_name}" running in COLLABORATION mode.

Your job is to orchestrate multiple specialized agents to collaboratively solve the user's request.

## Team Members
{members_text}

## Default Workflow
{workflow_text}

## Max Nesting Depth
{max_depth}

## How to work
1. When the user gives you a task, decide which team member(s) to involve.
2. Use the `team_dispatch` tool to delegate sub-tasks to the appropriate member by role.
3. Members may ask for help from other members via you — you'll see their questions and should route them to the right member.
4. Synthesize all results and present a coherent answer to the user.

## Rules
- Choose the right member based on their role and capabilities.
- You can dispatch to multiple members in sequence or as needed.
- If multiple members can work independently, use `team_dispatch_batch` to run them in parallel.
- Workers can ask you for help via `team_ask_coordinator` — handle these by dispatching to the appropriate team member.
- Use `team_task_status` to check on dispatched tasks.
- Nesting depth is limited to {max_depth} — avoid infinite loops.
- Present a clear summary when done.
"""


def build_worker_prompt(
    task_prompt: str,
    context: str,
    role: str,
    role_label: str,
    trace_file_path: str = "",
) -> str:
    """Build the prompt sent to a worker session."""
    parts = []
    parts.append(f"You are acting as **{role_label or role}** in a team collaboration.\n")
    if context:
        parts.append(f"## Context from previous steps\n{context}\n")
    parts.append(f"## Your task\n{task_prompt}")
    if trace_file_path:
        parts.append(
            f"\n## Trace Context\n"
            f"A trace file records the complete call chain for the current requirement. "
            f"You can read it to understand what other agents have done and what files have been changed.\n"
            f"Trace file path: {trace_file_path}"
        )
    return "\n".join(parts)
