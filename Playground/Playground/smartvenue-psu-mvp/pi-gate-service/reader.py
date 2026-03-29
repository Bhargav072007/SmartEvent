from __future__ import annotations

from abc import ABC, abstractmethod


class BaseNFCReader(ABC):
    @abstractmethod
    def read_token(self) -> str:
        """Return a ticket token string from the NFC reader."""


class MockManualReader(BaseNFCReader):
    def read_token(self) -> str:
        return input("Tap token (or type demo token): ").strip()


class PlaceholderHardwareReader(BaseNFCReader):
    def read_token(self) -> str:
        raise NotImplementedError(
            "Replace PlaceholderHardwareReader.read_token() with your real NFC hardware integration."
        )


def build_reader(mode: str) -> BaseNFCReader:
    if mode == "mock":
        return MockManualReader()
    if mode == "hardware":
        return PlaceholderHardwareReader()
    raise ValueError(f"Unsupported reader mode: {mode}")
