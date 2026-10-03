"""private/ 폴더의 개인 학습 자료(PDF)에서 텍스트·이미지를 추출한다.

입력과 출력 모두 private/ 안에만 머문다(private/ 는 .gitignore 대상).
  python scripts/extract.py pdf <private/ 기준 경로> [암호]   → private/_out/<이름>.txt (+ 텍스트 없는 페이지는 이미지 추출)
  python scripts/extract.py unzip <private/ 기준 zip 경로>    → private/_out/<zip이름>/
"""
from __future__ import annotations

import sys
import zipfile
from pathlib import Path

ROOT = (Path(__file__).resolve().parent.parent / "private").resolve()
OUT = ROOT / "_out"


def inside_private(rel: str) -> Path:
    p = (ROOT / rel).resolve()
    if ROOT not in p.parents and p != ROOT:
        sys.exit(f"private/ 밖의 경로는 처리하지 않습니다: {rel}")
    return p


def pdf(rel: str, password: str | None = None) -> None:
    import pypdf

    src = inside_private(rel)
    r = pypdf.PdfReader(str(src))
    if r.is_encrypted:
        if not password or r.decrypt(password) == 0:
            sys.exit("LOCKED: 암호가 필요하거나 틀렸습니다")
    OUT.mkdir(exist_ok=True)
    stem = src.stem[:80]
    lines, image_pages = [], []
    for i, page in enumerate(r.pages, 1):
        text = (page.extract_text() or "").strip()
        lines.append(f"\n===== page {i} =====\n{text}")
        if len(text) < 40:  # 스캔본 페이지: 이미지로 저장해 직접 판독
            for j, img in enumerate(page.images):
                dest = OUT / f"{stem}_p{i:03d}_{j}{Path(img.name).suffix or '.png'}"
                dest.write_bytes(img.data)
                image_pages.append(dest.name)
    txt = OUT / f"{stem}.txt"
    txt.write_text("".join(lines), encoding="utf-8")
    print(f"pages={len(r.pages)} chars={sum(len(l) for l in lines)} text={txt.relative_to(ROOT)} images={len(image_pages)}")


def unzip(rel: str) -> None:
    src = inside_private(rel)
    dest = OUT / src.stem
    dest.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(src) as z:
        for info in z.infolist():
            # 한글 파일명이 cp437로 깨진 zip 보정
            try:
                name = info.filename.encode("cp437").decode("cp949")
            except (UnicodeEncodeError, UnicodeDecodeError):
                name = info.filename
            target = (dest / name).resolve()
            if dest.resolve() not in target.parents:
                continue
            if info.is_dir():
                target.mkdir(parents=True, exist_ok=True)
            else:
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(z.read(info))
    print(f"unzipped to {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    cmd, *args = sys.argv[1:] or ["help"]
    if cmd == "pdf":
        pdf(*args)
    elif cmd == "unzip":
        unzip(*args)
    else:
        print(__doc__)
