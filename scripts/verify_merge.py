"""(docs/pipeline 4단계) 블라인드 재풀이 결과(solved-*.json)를 문항 파일에 반영.
일치 → answerBasis 'ai' 유지, 불일치 → 'review' + 해설에 다른 풀이 기록."""
import glob, json, collections

solved = {s['id']: s for f in glob.glob('private/verify/solved-*.json') for s in json.load(open(f))}
stat = collections.Counter()
for f in sorted(glob.glob('private/questions/itpe-*.json')):
    qs = json.load(open(f))
    for q in qs:
        if q.get('answerBasis') != 'ai':
            continue
        s = solved.get(q['id'])
        if not s:
            stat['missing'] += 1
            continue
        if sorted(s['answer']) == sorted(q['answer']):
            stat['agree'] += 1
        else:
            stat['disagree'] += 1
            q['answerBasis'] = 'review'
            alt = ', '.join(chr(65 + i) for i in sorted(s['answer']))
            note = f" [검토 필요] 독립 풀이에서는 {alt}를 골랐다: {s['reason']}"
            if '[검토 필요]' not in q['explanation']:
                q['explanation'] += note
    json.dump(qs, open(f, 'w'), ensure_ascii=False, indent=2)
print(dict(stat))
