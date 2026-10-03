"""새로 변환한 문항 파일이 기존 문제은행과 겹치는지 검사한다.

  python3 scripts/dedupe.py private/questions/<새파일>.json [--drop]

- 지문을 정규화(공백·문장부호 제거)해 기존 문항(src/data/generated, private/questions의 다른 파일)과 비교
- 유사도 0.92 이상: 사실상 같은 문항 → --drop 이면 새 파일에서 제거
- 0.80~0.92: 비슷한 문항 → 목록만 출력 (보기·정답이 달라 일부러 남길 수도 있음)
"""
from __future__ import annotations

import difflib
import glob
import json
import re
import sys
from pathlib import Path

SAME, SIMILAR = 0.92, 0.80


def norm(s: str) -> str:
    return re.sub(r"[\s\W_]+", "", s).lower()


def main() -> None:
    target = Path(sys.argv[1])
    drop = "--drop" in sys.argv
    new = json.loads(target.read_text(encoding="utf-8"))
    existing = []
    for f in glob.glob("src/data/generated/*.json") + glob.glob("private/questions/*.json"):
        if Path(f).resolve() == target.resolve():
            continue
        existing += [(q["id"], norm(q["stem"])) for q in json.loads(Path(f).read_text(encoding="utf-8"))]

    keep, dupes, similar = [], [], []
    for q in new:
        s = norm(q["stem"])
        best_id, best = None, 0.0
        for eid, es in existing:
            # 길이 차이가 크면 비교 생략 (속도)
            if abs(len(es) - len(s)) > max(len(s), len(es)) * 0.3:
                continue
            r = difflib.SequenceMatcher(None, s, es).ratio()
            if r > best:
                best_id, best = eid, r
        if best >= SAME:
            dupes.append((q["id"], best_id, best))
            if drop:
                continue
        elif best >= SIMILAR:
            similar.append((q["id"], best_id, best))
        keep.append(q)

    print(f"{target.name}: {len(new)}문항 · 중복 {len(dupes)} · 유사 {len(similar)}")
    for a, b, r in dupes:
        print(f"  중복 {a} ≈ {b} ({r:.2f})")
    for a, b, r in similar:
        print(f"  유사 {a} ~ {b} ({r:.2f})")
    if drop and dupes:
        target.write_text(json.dumps(keep, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"  → 중복 {len(dupes)}문항 제거, {len(keep)}문항 남김")


if __name__ == "__main__":
    main()
