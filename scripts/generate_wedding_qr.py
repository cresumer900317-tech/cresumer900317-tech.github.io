"""박기백·박지은 결혼식 사진 업로드 QR 코드 PNG 생성.

실행:
    python scripts/generate_wedding_qr.py

결과:
    wedding/qr.png (1000x1000 PNG, error correction H)
"""
from __future__ import annotations

import os
import sys

try:
    import qrcode
    from qrcode.constants import ERROR_CORRECT_H
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("qrcode[pil] 가 설치되어 있지 않습니다.", file=sys.stderr)
    print("→ pip install 'qrcode[pil]'", file=sys.stderr)
    sys.exit(1)


URL = "https://친구들.com/wedding"  # 하객이 스캔하는 업로드 페이지
OUT_PATH = os.path.join("wedding", "qr.png")
TARGET_PX = 1000


def main():
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,  # 가운데 하트 덮어도 복원 가능
        box_size=20,
        border=2,
    )
    qr.add_data(URL)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#3a2620", back_color="#ffffff").convert("RGB")

    # 정사이즈로 리샘플
    img = img.resize((TARGET_PX, TARGET_PX), Image.NEAREST)

    # 가운데 흰색 둥근 패치 + 하트
    draw = ImageDraw.Draw(img)
    patch = int(TARGET_PX * 0.18)
    cx = TARGET_PX // 2
    cy = TARGET_PX // 2
    # 살짝 둥근 사각형 (Pillow rounded_rectangle 사용)
    box = [cx - patch // 2, cy - patch // 2, cx + patch // 2, cy + patch // 2]
    try:
        draw.rounded_rectangle(box, radius=int(patch * 0.18), fill="#ffffff")
    except AttributeError:
        draw.rectangle(box, fill="#ffffff")

    # 하트 텍스트 (Pillow 기본 폰트 — 이모지 지원 안 될 수 있어 fallback)
    heart_size = int(patch * 0.7)
    heart_color = "#c98a7d"
    drew_text = False
    for candidate in ("seguiemj.ttf", "AppleColorEmoji.ttf", "NotoColorEmoji.ttf"):
        try:
            font = ImageFont.truetype(candidate, heart_size)
            draw.text((cx, cy), "❤", anchor="mm", fill=heart_color, font=font, embedded_color=True)
            drew_text = True
            break
        except (OSError, IOError):
            continue

    if not drew_text:
        # 텍스트 폰트 실패 → 도형으로 하트 그리기
        draw_heart(draw, cx, cy, int(patch * 0.6), heart_color)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    img.save(OUT_PATH, "PNG", optimize=True)
    print(f"[OK] Saved: {OUT_PATH}")
    print(f"     URL:   {URL}")
    print(f"     Size:  {TARGET_PX}x{TARGET_PX}")


def draw_heart(draw, cx, cy, size, color):
    """폰트 없이 폴리곤으로 하트 그리기."""
    s = size / 2
    # 간단한 하트 모양 좌표 — 위에 두 원, 아래 삼각형
    r = int(s * 0.55)
    left_cx = cx - int(s * 0.45)
    right_cx = cx + int(s * 0.45)
    top_cy = cy - int(s * 0.2)
    draw.ellipse([left_cx - r, top_cy - r, left_cx + r, top_cy + r], fill=color)
    draw.ellipse([right_cx - r, top_cy - r, right_cx + r, top_cy + r], fill=color)
    draw.polygon([
        (cx - int(s * 0.95), top_cy + int(r * 0.15)),
        (cx + int(s * 0.95), top_cy + int(r * 0.15)),
        (cx, cy + int(s * 0.85)),
    ], fill=color)


if __name__ == "__main__":
    main()
