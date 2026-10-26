# PMP Prep

PMP 시험 반복 학습 앱. React + Vite 프런트(`src/`), Render용 Express 서버(`server/index.mjs`), Postgres(문항 `pmp_questions`, 학습 기록 `pmp_progress`).

## 배포
- 사용 주소는 **GitHub Pages 하나**: https://sson82.github.io/pmp-prep/ (`sh scripts/deploy.sh`, 빌드 시 VITE_API_BASE=Render 주소).
- Render 서비스 `pmp-prep`(https://pmp-prep-d1iu.onrender.com)는 **API 전용**: 로그인(APP_PASSWORD → 토큰, Authorization: Bearer), 비공개 문항 `/api/questions`, 기기 간 기록 `/api/progress`. CORS는 ALLOWED_ORIGINS(기본 https://sson82.github.io). 화면 요청은 GitHub 주소로 302. push 후 자동 배포가 안 되면 `python3 scripts/render_deploy.py`.
- 서버 코드를 바꾸면 Render 배포, 화면 코드를 바꾸면 GitHub Pages 배포(둘 다 바꿨으면 둘 다).

## 문항 데이터 규칙
- `src/data/generated/*.json`: 직접 작성한 오리지널 문항(공개 가능, id `o8-`는 8판 기준 신규). 영역 비율 33/41/26(±3%p), 보기 길이 편향·주제 분류는 `npx vitest run`이 검사.
- 학습 체계 = PMI 공식 2026 ECO 26개 과제(`src/data/eco.ts`, 원문 `docs/pipeline/eco-2026-tasks.txt`). 문항의 topic=과제 이름, eco=코드(P1~P8·R1~R10·B1~B8), domain=과제 영역. 리스크·변경 통제·이슈·거버넌스는 Business(B), 의사소통·지식 이전은 People(P). 분류 규칙 `docs/pipeline/eco-classify-spec.md`, 일괄 반영 `python3 scripts/apply_eco.py <매핑> <파일...>`.
- 공식 ECO: 180문항(10개 미채점)·240분, 예측형 약 40% / 애자일·하이브리드 약 60%.
- 학원 수험자료에서 변환한 문항은 저작권(제3자 공유 금지) 때문에 **절대 git에 넣지 않는다**. `private/`(gitignore)에만 두고 Render DB로만 올린다. 스크린샷·로그에도 원문을 남기지 말 것.
- 덤프(유출 시험 문제)로 표시된 자료는 변환하지 않는다.

## 기출(학원) 문제 추가 파이프라인
사용자가 새 파일을 `private/inbox/`에 넣고 "새 문제 변환해줘"라고 하면:
1. 추출: `.venv/bin/python scripts/extract.py pdf "<private/ 기준 경로>" [암호]` → `private/_out/` (암호는 같은 폴더 jpg 이미지에 있는 경우가 많음, Read로 확인). zip은 `extract.py unzip`.
2. 변환: 50문항 안팎씩 나눠 에이전트에게 `docs/pipeline/convert-spec.md`대로 `private/questions/<배치>.json` 작성 요청.
3. 중복 검사: `python3 scripts/dedupe.py private/questions/<배치>.json --drop`.
4. 정답 검증(정답지 없는 문항): answerBasis 'ai' 문항을 지문·보기만 남긴 블라인드 파일로 만들어 다른 에이전트가 `docs/pipeline/verify-spec.md`대로 재풀이 → `private/verify/solved-*.json` → `python3 scripts/verify_merge.py` (불일치는 'review' + 해설에 대안 기록).
5. 업로드: `node scripts/seed.mjs` (`private/.env`의 DATABASE_URL = Render External URL). 또는 앱의 학습현황 → 문제 세트 가져오기(JSON)로 서버에 업로드.
6. 사용자에게 문항 수·건너뛴 문항·검토 필요 문항 수를 보고.
