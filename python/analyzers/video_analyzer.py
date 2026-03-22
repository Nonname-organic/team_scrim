"""
VALORANT Scrim Analyzer - Video Analysis Engine
動画からイベント（キルログ、プラントタイミング等）を抽出する

依存: opencv-python, pytesseract, anthropic
"""
from __future__ import annotations

import os
import json
import re
import time
from pathlib import Path
from typing import Optional

import cv2
import numpy as np

try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

try:
    import anthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False


# ============================================================
# Frame extraction
# ============================================================

def extract_key_frames(
    video_path: str,
    output_dir: str,
    interval_sec: float = 1.0,
    max_frames: int = 2000,
) -> list[str]:
    """
    動画からキーフレームを抽出する。
    interval_sec 秒ごとに1フレーム保存。
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise FileNotFoundError(f"Cannot open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    step = max(1, int(fps * interval_sec))

    Path(output_dir).mkdir(parents=True, exist_ok=True)
    saved = []
    frame_idx = 0
    count = 0

    print(f"[Video] FPS={fps:.1f}, Total={total_frames} frames, Step={step}")

    while frame_idx < total_frames and count < max_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
        ret, frame = cap.read()
        if not ret:
            break

        timestamp = frame_idx / fps
        path = os.path.join(output_dir, f"frame_{count:05d}_{timestamp:.2f}s.jpg")
        cv2.imwrite(path, frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        saved.append(path)

        frame_idx += step
        count += 1

    cap.release()
    print(f"[Video] Extracted {len(saved)} frames to {output_dir}")
    return saved


# ============================================================
# Region-of-interest (ROI) definitions for VALORANT UI
# ============================================================

# These are approximate normalized coordinates [x, y, w, h]
# Adjust per resolution / UI scale
VALORANT_ROI = {
    "killfeed":    (0.72, 0.05, 0.28, 0.40),  # top-right kill feed
    "round_num":   (0.45, 0.00, 0.10, 0.05),  # round number center-top
    "scoreboard":  (0.30, 0.00, 0.40, 0.06),  # score display
    "plant_icon":  (0.48, 0.90, 0.04, 0.05),  # spike plant indicator
    "timer":       (0.46, 0.02, 0.08, 0.04),  # round timer
}

def crop_roi(frame: np.ndarray, roi: tuple[float, float, float, float]) -> np.ndarray:
    h, w = frame.shape[:2]
    x = int(roi[0] * w)
    y = int(roi[1] * h)
    rw = int(roi[2] * w)
    rh = int(roi[3] * h)
    return frame[y:y+rh, x:x+rw]


# ============================================================
# OCR-based event detection
# ============================================================

class RuleBasedDetector:
    """
    Tesseract OCR + ルールベースでVALORANTのイベントを検出する。
    ML不要でオフラインで動作する軽量版。
    """

    KILL_PATTERN = re.compile(
        r'([A-Za-z0-9#]+)\s+(?:killed|ELIMINATED|eliminated)\s+([A-Za-z0-9#]+)',
        re.IGNORECASE
    )
    PLANT_PATTERN = re.compile(r'spike.{0,10}plant', re.IGNORECASE)
    DEFUSE_PATTERN = re.compile(r'spike.{0,10}defus', re.IGNORECASE)
    ROUND_PATTERN = re.compile(r'round\s*(\d+)', re.IGNORECASE)
    FIRSTBLOOD_PATTERN = re.compile(r'first.{0,5}blood', re.IGNORECASE)

    def __init__(self, tesseract_cmd: Optional[str] = None):
        if TESSERACT_AVAILABLE and tesseract_cmd:
            pytesseract.pytesseract.tesseract_cmd = tesseract_cmd

    def preprocess_for_ocr(self, img: np.ndarray) -> np.ndarray:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        # Upscale for better OCR
        gray = cv2.resize(gray, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)
        # Contrast enhancement
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        # Threshold
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary

    def ocr(self, img: np.ndarray) -> str:
        if not TESSERACT_AVAILABLE:
            return ""
        processed = self.preprocess_for_ocr(img)
        config = "--psm 6 -l eng"
        return pytesseract.image_to_string(processed, config=config)

    def detect_kill(self, text: str) -> Optional[dict]:
        m = self.KILL_PATTERN.search(text)
        if m:
            return {
                "event_type": "kill",
                "killer": m.group(1),
                "victim": m.group(2),
            }
        return None

    def detect_plant(self, text: str) -> Optional[dict]:
        if self.PLANT_PATTERN.search(text):
            return {"event_type": "plant"}
        return None

    def detect_defuse(self, text: str) -> Optional[dict]:
        if self.DEFUSE_PATTERN.search(text):
            return {"event_type": "defuse"}
        return None

    def detect_round_number(self, text: str) -> Optional[int]:
        m = self.ROUND_PATTERN.search(text)
        if m:
            return int(m.group(1))
        return None

    def process_frame(self, frame: np.ndarray, timestamp_sec: float) -> list[dict]:
        events = []

        # Check killfeed ROI
        killfeed_img = crop_roi(frame, VALORANT_ROI["killfeed"])
        killfeed_text = self.ocr(killfeed_img)

        kill = self.detect_kill(killfeed_text)
        if kill:
            kill["timestamp_sec"] = timestamp_sec
            events.append(kill)

        # Check plant/defuse
        plant_img = crop_roi(frame, VALORANT_ROI["plant_icon"])
        # Color detection for spike plant indicator (orange/yellow)
        hsv = cv2.cvtColor(plant_img, cv2.COLOR_BGR2HSV)
        orange_mask = cv2.inRange(hsv,
            np.array([10, 100, 100]),
            np.array([30, 255, 255])
        )
        if orange_mask.sum() > 500:  # Spike planted indicator visible
            events.append({
                "event_type": "plant",
                "timestamp_sec": timestamp_sec,
                "detected_by": "color",
            })

        return events


# ============================================================
# Claude Vision-based analyzer (more accurate, uses API)
# ============================================================

class ClaudeVideoAnalyzer:
    """
    Claude Vision APIを使ってフレームを解析する高精度版。
    Rate limit対策のため、変化のあるフレームのみ送信する。
    """

    def __init__(self, client: "anthropic.Anthropic"):
        self.client = client
        self._prev_hash: Optional[int] = None

    def frame_changed(self, frame: np.ndarray, threshold: float = 0.02) -> bool:
        """前フレームと比較して変化があるかチェック（API節約）"""
        small = cv2.resize(frame, (64, 36))
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        h = hash(gray.tobytes())
        changed = self._prev_hash is None or abs(h - self._prev_hash) > threshold * 1e15
        self._prev_hash = h
        return changed

    def analyze_frame(
        self,
        frame: np.ndarray,
        timestamp_sec: float,
        round_number: Optional[int] = None,
    ) -> list[dict]:
        """Claude Visionでフレームを解析してイベントを抽出"""
        _, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        import base64
        b64 = base64.b64encode(buf.tobytes()).decode()

        prompt = f"""このVALORANTの試合画面（時刻: {timestamp_sec:.1f}秒, ラウンド: {round_number or '不明'}）から
以下のイベントが発生しているか判定してください。

判定してほしいこと：
1. キルが発生しているか（キラー名、被キル者名、武器）
2. スパイクがプラントされているか
3. スパイクがデュースされているか
4. ラウンドが終了しているか（勝敗）
5. ファーストブラッドか
6. クラッチシチュエーションか

イベントがない場合は null を返してください。

イベントがある場合は以下のJSON形式で返してください：
```json
[
  {{
    "event_type": "kill|plant|defuse|round_end|firstblood",
    "timestamp_sec": {timestamp_sec:.1f},
    "killer": "名前またはnull",
    "victim": "名前またはnull",
    "weapon": "武器名またはnull",
    "headshot": true/false,
    "site": "A/B/Cまたはnull",
    "result": "win/lossまたはnull（round_endの場合）"
  }}
]
```"""

        try:
            msg = self.client.messages.create(
                model="claude-haiku-4-5-20251001",  # コスト効率のため
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": "image/jpeg",
                                "data": b64,
                            }
                        },
                        {"type": "text", "text": prompt}
                    ]
                }]
            )
            text = msg.content[0].text
            if text.strip().lower() == "null" or "null" in text[:30]:
                return []

            json_match = re.search(r'```json\n([\s\S]*?)\n```', text)
            if json_match:
                return json.loads(json_match.group(1))
        except Exception as e:
            print(f"[Claude Vision] Error at {timestamp_sec:.1f}s: {e}")

        return []


# ============================================================
# Main video processing pipeline
# ============================================================

class VideoProcessor:
    """
    動画処理パイプライン。
    OCR + Claude Vision の組み合わせで精度を上げる。
    将来: YOLOv8モデルに差し替え可能な設計。
    """

    def __init__(
        self,
        use_claude: bool = True,
        use_ocr: bool = True,
        tesseract_cmd: Optional[str] = None,
    ):
        self.use_claude = use_claude and CLAUDE_AVAILABLE
        self.use_ocr = use_ocr and TESSERACT_AVAILABLE
        self.ocr_detector = RuleBasedDetector(tesseract_cmd) if self.use_ocr else None

        if self.use_claude:
            import anthropic
            self.claude_analyzer = ClaudeVideoAnalyzer(anthropic.Anthropic())

    def process_video(
        self,
        video_path: str,
        output_dir: str = "/tmp/frames",
        ocr_interval: float = 0.5,
        claude_interval: float = 3.0,
    ) -> dict:
        """
        動画を処理してイベントリストを返す。

        Returns:
            {
                "events": [...],
                "metadata": {...}
            }
        """
        all_events: list[dict] = []
        current_round = 1

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise FileNotFoundError(f"Cannot open: {video_path}")

        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration_sec = total_frames / fps

        ocr_step   = max(1, int(fps * ocr_interval))
        claude_step = max(1, int(fps * claude_interval))

        last_claude_sec = -999.0
        seen_events: set[str] = set()  # Dedup

        print(f"[Pipeline] Processing {video_path}")
        print(f"  Duration: {duration_sec:.1f}s, FPS: {fps:.1f}")
        print(f"  OCR every: {ocr_interval}s, Claude every: {claude_interval}s")

        frame_idx = 0
        while frame_idx < total_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret:
                break

            timestamp_sec = frame_idx / fps

            # OCR detection (lightweight)
            if self.use_ocr and frame_idx % ocr_step == 0:
                events = self.ocr_detector.process_frame(frame, timestamp_sec)  # type: ignore
                for ev in events:
                    key = f"{ev['event_type']}_{int(timestamp_sec)}"
                    if key not in seen_events:
                        seen_events.add(key)
                        ev["round_number"] = current_round
                        all_events.append(ev)

            # Claude Vision detection (accurate but slower)
            if (self.use_claude and
                timestamp_sec - last_claude_sec >= claude_interval and
                self.claude_analyzer.frame_changed(frame)):  # type: ignore
                last_claude_sec = timestamp_sec
                events = self.claude_analyzer.analyze_frame(frame, timestamp_sec, current_round)  # type: ignore
                for ev in events:
                    key = f"{ev['event_type']}_{int(ev.get('timestamp_sec', timestamp_sec))}"
                    if key not in seen_events:
                        seen_events.add(key)
                        ev.setdefault("round_number", current_round)
                        all_events.append(ev)
                    if ev.get("event_type") == "round_end":
                        current_round += 1

                time.sleep(0.1)  # Rate limit courtesy

            frame_idx += min(ocr_step, claude_step)

        cap.release()

        # Sort by timestamp
        all_events.sort(key=lambda x: x.get("timestamp_sec", 0))

        return {
            "events": all_events,
            "metadata": {
                "video_path": video_path,
                "duration_sec": round(duration_sec, 1),
                "fps": round(fps, 1),
                "total_events": len(all_events),
                "rounds_detected": current_round - 1,
            }
        }


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python video_analyzer.py <video_path> [output.json]")
        sys.exit(1)

    video_path = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else "events_output.json"

    processor = VideoProcessor(use_claude=True, use_ocr=True)
    result = processor.process_video(video_path)

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n[Done] {len(result['events'])} events → {output_file}")
