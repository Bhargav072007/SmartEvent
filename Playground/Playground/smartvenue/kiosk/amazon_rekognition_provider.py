from __future__ import annotations

import base64
import json
import os
from pathlib import Path
from typing import Any, Optional

import cv2

try:
    import boto3
except ModuleNotFoundError:  # pragma: no cover
    boto3 = None


def _env_flag(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


class RekognitionProvider:
    def __init__(self) -> None:
        self.provider_name = "rekognition"
        self.enabled = os.getenv("SMARTVENUE_FACE_PROVIDER", "rekognition").strip().lower() == "rekognition"
        self.available = boto3 is not None
        self.region = os.getenv("AWS_REGION") or os.getenv("AWS_DEFAULT_REGION") or ""
        self.collection_id = os.getenv("SMARTVENUE_REKOGNITION_COLLECTION", "smartvenue-face-pass")
        self.threshold = float(os.getenv("SMARTVENUE_REKOGNITION_THRESHOLD", "70"))
        self.compare_threshold = float(os.getenv("SMARTVENUE_COMPARE_FACES_THRESHOLD", "72"))
        self.debug = _env_flag("SMARTVENUE_REKOGNITION_DEBUG")
        self.client = None
        self.face_pass_json_path = Path(
            os.getenv(
                "SMARTVENUE_FACE_PASS_JSON",
                str(Path(__file__).resolve().parents[4] / "smartevent2" / "data" / "face_pass_profiles.json"),
            )
        )

        if self.enabled and self.available:
            session = boto3.Session()
            self.region = self.region or session.region_name or "ap-south-1"
            self.client = session.client("rekognition", region_name=self.region)
        elif not self.region:
            self.region = "ap-south-1"

    def is_ready(self) -> bool:
        return self.enabled and self.available and self.client is not None

    def status(self) -> dict[str, Any]:
        return {
            "enabled": self.enabled,
            "available": self.available,
            "provider": self.provider_name,
            "region": self.region,
            "collection_id": self.collection_id,
            "threshold": self.threshold,
            "compare_threshold": self.compare_threshold,
            "face_pass_json_path": str(self.face_pass_json_path),
        }

    def ensure_collection(self) -> None:
        if not self.is_ready():
            return
        try:
            self.client.describe_collection(CollectionId=self.collection_id)
        except Exception:
            self.client.create_collection(CollectionId=self.collection_id)

    def _image_to_bytes(self, image) -> bytes:
        ok, encoded = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
        if not ok:
            raise ValueError("Could not encode image for Rekognition")
        return encoded.tobytes()

    def _decode_data_url(self, value: str) -> Optional[bytes]:
        if not value:
            return None
        payload = value.split(",", 1)[1] if "," in value else value
        try:
            return base64.b64decode(payload)
        except Exception:
            return None

    def _load_profiles(self) -> list[dict[str, Any]]:
        try:
            return json.loads(self.face_pass_json_path.read_text())
        except Exception:
            return []

    def _fan_id_from_profile(self, profile: dict[str, Any]) -> str:
        return str(profile.get("email") or profile.get("id") or "")

    def _compare_against_profiles(self, image_bytes: bytes) -> dict[str, Any]:
        profiles = self._load_profiles()
        best_match: Optional[dict[str, Any]] = None
        best_similarity = 0.0
        compared_profiles = 0

        for profile in profiles:
            if profile.get("verification_status") != "verified":
                continue
            source_bytes = self._decode_data_url(str(profile.get("selfie_url") or ""))
            if not source_bytes:
                continue
            compared_profiles += 1

            try:
                response = self.client.compare_faces(
                    SourceImage={"Bytes": source_bytes},
                    TargetImage={"Bytes": image_bytes},
                    SimilarityThreshold=self.compare_threshold,
                    QualityFilter="AUTO",
                )
            except Exception:
                continue

            matches = response.get("FaceMatches", [])
            if not matches:
                continue

            similarity = float(matches[0].get("Similarity", 0.0))
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = profile

        if not best_match:
            return {
                "status": "no-match",
                "matched": False,
                "match_source": "compare_faces",
                "compared_profiles": compared_profiles,
            }

        return {
            "status": "matched",
            "matched": True,
            "fan_id": self._fan_id_from_profile(best_match),
            "confidence": best_similarity / 100.0,
            "collection_id": self.collection_id,
            "match_source": "compare_faces",
            "compared_profiles": compared_profiles,
            "profile": {
                "id": best_match.get("id"),
                "name": best_match.get("name"),
                "email": best_match.get("email"),
                "ticket_section": best_match.get("ticket_section"),
                "assigned_gate": best_match.get("assigned_gate"),
                "row": best_match.get("row"),
                "seat": best_match.get("seat"),
                "ticket_code": best_match.get("ticket_code"),
            },
        }

    def _matching_face_ids(self, external_image_id: str) -> list[str]:
        if not self.is_ready():
            return []

        matched: list[str] = []
        next_token: Optional[str] = None
        while True:
            kwargs: dict[str, Any] = {"CollectionId": self.collection_id, "MaxResults": 100}
            if next_token:
                kwargs["NextToken"] = next_token
            response = self.client.list_faces(**kwargs)
            for face in response.get("Faces", []):
                if face.get("ExternalImageId") == external_image_id and face.get("FaceId"):
                    matched.append(face["FaceId"])
            next_token = response.get("NextToken")
            if not next_token:
                break
        return matched

    def register_face(self, fan_id: str, image) -> dict[str, Any]:
        if not self.is_ready():
            return {"status": "disabled", **self.status()}

        self.ensure_collection()
        stale_face_ids = self._matching_face_ids(fan_id)
        if stale_face_ids:
            self.client.delete_faces(CollectionId=self.collection_id, FaceIds=stale_face_ids)

        response = self.client.index_faces(
            CollectionId=self.collection_id,
            Image={"Bytes": self._image_to_bytes(image)},
            ExternalImageId=fan_id,
            DetectionAttributes=[],
            MaxFaces=1,
            QualityFilter="AUTO",
        )

        records = response.get("FaceRecords", [])
        return {
            "status": "ok" if records else "no-face",
            "indexed_faces": len(records),
            "external_image_id": fan_id,
            "collection_id": self.collection_id,
        }

    def search_face(self, image) -> dict[str, Any]:
        if not self.is_ready():
            return {"status": "disabled", **self.status()}

        self.ensure_collection()
        image_bytes = self._image_to_bytes(image)

        direct_profile_match = self._compare_against_profiles(image_bytes)
        if direct_profile_match.get("matched"):
            return direct_profile_match

        response = self.client.search_faces_by_image(
            CollectionId=self.collection_id,
            Image={"Bytes": image_bytes},
            MaxFaces=1,
            FaceMatchThreshold=self.threshold,
        )
        matches = response.get("FaceMatches", [])
        if not matches:
            return {"status": "no-match", "matched": False, "match_source": "collection"}

        best = matches[0]
        face = best.get("Face", {})
        return {
            "status": "matched",
            "matched": True,
            "fan_id": face.get("ExternalImageId") or face.get("FaceId", ""),
            "confidence": float(best.get("Similarity", 0.0)) / 100.0,
            "face_id": face.get("FaceId", ""),
            "collection_id": self.collection_id,
            "match_source": "collection",
            "compared_profiles": 0,
        }


_PROVIDER = RekognitionProvider()


def get_rekognition_provider() -> RekognitionProvider:
    return _PROVIDER
