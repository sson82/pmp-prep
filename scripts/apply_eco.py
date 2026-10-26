"""ECO 과제 분류 결과(id → 코드)를 문항 파일에 반영한다.
  python3 scripts/apply_eco.py <매핑.json> <문항파일.json> [...]
- topic ← 과제 이름, domain ← 과제 영역, eco ← 코드
- 이전 topic은 tags 맨 앞에 보존(세부 주제)
"""
import json, re, sys

src = open('src/data/eco.ts', encoding='utf-8').read()
TASKS = {c: (d, ko) for c, d, ko in re.findall(r"code: '(\w+)', domain: '(\w+)', ko: '([^']+)'", src)}
assert len(TASKS) == 26, len(TASKS)

mapping = json.load(open(sys.argv[1], encoding='utf-8'))
changed = moved = 0
for path in sys.argv[2:]:
    raw = open(path, encoding='utf-8').read()
    qs = json.loads(raw)
    indent = 1 if raw.startswith('[\n {') else 2
    for q in qs:
        code = mapping.get(q['id'])
        if not code:
            continue
        dom, ko = TASKS[code]
        old = q.get('topic')
        if old and old != ko and old not in q['tags'] and old not in [t for _, t in TASKS.values()]:
            q['tags'] = [old] + q['tags']
        if q['domain'] != dom:
            moved += 1
        q['domain'], q['topic'], q['eco'] = dom, ko, code
        changed += 1
    open(path, 'w', encoding='utf-8').write(json.dumps(qs, ensure_ascii=False, indent=indent) + ('\n' if raw.endswith('\n') else ''))
print(f'적용 {changed}문항 · 영역 이동 {moved}문항')
