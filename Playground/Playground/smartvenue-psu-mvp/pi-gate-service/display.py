from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime


class BaseDisplay(ABC):
    @abstractmethod
    def show_idle(self, gate_id: str) -> None:
        ...

    @abstractmethod
    def show_result(self, gate_id: str, result: str, display_text: str) -> None:
        ...


class ConsoleDisplay(BaseDisplay):
    def show_idle(self, gate_id: str) -> None:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {gate_id} ready. Waiting for NFC tap.")

    def show_result(self, gate_id: str, result: str, display_text: str) -> None:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {gate_id} -> {result}: {display_text}")


class SenseCapIndicatorDisplay(BaseDisplay):
    def show_idle(self, gate_id: str) -> None:
        print(f"[SenseCAP] {gate_id} ready screen")

    def show_result(self, gate_id: str, result: str, display_text: str) -> None:
        # Replace this with the real D1 rendering calls once your device code is ready.
        print(f"[SenseCAP] {gate_id} {result} {display_text}")


def build_display(mode: str) -> BaseDisplay:
    if mode == "console":
        return ConsoleDisplay()
    if mode == "sensecap":
        return SenseCapIndicatorDisplay()
    raise ValueError(f"Unsupported display mode: {mode}")
