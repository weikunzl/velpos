from __future__ import annotations

import ast
from pathlib import Path
import unittest

from domain.session.acl.agent_gateway import AgentCapability, AgentGateway
from domain.session.acl.claude_agent_gateway import ClaudeAgentGateway as ClaudeAgentGatewayPort
from infr.client.claude_agent_gateway import ClaudeAgentGateway


class TestAgentGatewayPort(unittest.TestCase):
    """锁定通用 AgentGateway 端口与旧 Claude 端口的兼容关系。"""

    def test_claude_gateway_port_alias_points_to_agent_gateway(self) -> None:
        """旧 Claude 端口导入路径应保持兼容，同时指向通用 AgentGateway。"""
        self.assertIs(ClaudeAgentGatewayPort, AgentGateway)

    def test_claude_gateway_advertises_supported_capabilities(self) -> None:
        """Claude 实现应显式声明能力，供后续多 Provider 路由按能力降级。"""
        gateway = ClaudeAgentGateway(cli_path="/bin/echo")

        capabilities = gateway.capabilities()

        self.assertIn(AgentCapability.COMPACT, capabilities)
        self.assertIn(AgentCapability.REWIND, capabilities)
        self.assertIn(AgentCapability.MODELS, capabilities)
        self.assertIn(AgentCapability.FORK, capabilities)
        self.assertIn(AgentCapability.LOAD, capabilities)
        self.assertIn(AgentCapability.CONTEXT_USAGE, capabilities)
        self.assertIn(AgentCapability.SESSION_FILES, capabilities)

    def test_session_websocket_depends_on_agent_gateway_port(self) -> None:
        """WebSocket 北向层应依赖通用端口，而不是 Claude 具体实现。"""
        source_path = Path(__file__).parents[2] / "ohs" / "ws" / "session_ws.py"
        tree = ast.parse(source_path.read_text(encoding="utf-8"))

        imports = [
            node.module
            for node in tree.body
            if isinstance(node, ast.ImportFrom) and node.module is not None
        ]

        self.assertIn("domain.session.acl.agent_gateway", imports)
        self.assertNotIn("infr.client.claude_agent_gateway", imports)


if __name__ == "__main__":
    unittest.main()
