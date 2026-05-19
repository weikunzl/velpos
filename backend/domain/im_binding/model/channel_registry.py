from __future__ import annotations

from collections.abc import Callable
from typing import Any

from domain.im_binding.model.channel_spec import ImChannelSpec
from domain.im_binding.model.channel_type import ImChannelType


class ImChannelRegistry:
    """IM 渠道注册表 — 运行时单例.

    适配器在启动时调用 register() 注册自身的能力声明和工厂函数。
    """

    def __init__(self) -> None:
        self._specs: dict[ImChannelType, ImChannelSpec] = {}
        self._factories: dict[ImChannelType, Callable[..., Any]] = {}

    def register(
        self,
        spec: ImChannelSpec,
        adapter_factory: Callable[..., Any],
    ) -> None:
        self._specs[spec.channel_type] = spec
        self._factories[spec.channel_type] = adapter_factory

    def list_all(self) -> list[ImChannelSpec]:
        """返回所有已注册渠道的 spec."""
        return list(self._specs.values())

    def get_spec(self, channel_type: ImChannelType) -> ImChannelSpec:
        if channel_type not in self._specs:
            raise ValueError(f"Unknown channel type: {channel_type}")
        return self._specs[channel_type]

    def get_adapter_factory(self, channel_type: ImChannelType) -> Callable[..., Any]:
        if channel_type not in self._factories:
            raise ValueError(f"No adapter registered for: {channel_type}")
        return self._factories[channel_type]

    @property
    def registered_types(self) -> list[ImChannelType]:
        return list(self._specs.keys())
