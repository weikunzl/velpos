from __future__ import annotations

"""Backward-compatibility alias for the generalized agent gateway port.

The port was generalized from ``ClaudeAgentGateway`` to the provider-agnostic
:class:`~domain.session.acl.agent_gateway.AgentGateway` (see
doc/acp-integration-research.md §16). This module preserves the historical
import path and name so existing call sites keep working:

    from domain.session.acl.claude_agent_gateway import ClaudeAgentGateway

New code should import :class:`AgentGateway` directly.
"""

from domain.session.acl.agent_gateway import AgentCapability, AgentGateway

# Historical name — kept as an alias, not a subclass, so that
# ``isinstance(x, ClaudeAgentGateway)`` and existing type annotations continue
# to resolve to the generalized port.
ClaudeAgentGateway = AgentGateway

__all__ = ["AgentGateway", "AgentCapability", "ClaudeAgentGateway"]
