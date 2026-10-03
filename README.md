# PMP Exam Prep Engine

PMP 기출 유형 반복 학습 웹앱 (React + TypeScript + Vite). PMBOK 7판 vs 8판 차이를 중점으로 다룬다.

- **오늘의 학습**: SM-2 간격 반복. 정답 여부, 풀이 시간(권장 80초 = 240분/180문항), 자기 확신도로 다음 복습일을 정한다. 신규 문항은 취약 도메인에서 더 많이 뽑는다.
- **오답노트**: 틀린 문항이 자동으로 쌓이고, 같은 세션 끝에 한 번 더 출제된다.
- **모의고사**: ECO 비중(People 33 / Process 41 / Business Env. 26), 시간 제한, 끝난 뒤 일괄 채점.
- **7판 vs 8판** 비교표, 도메인·판·주제별 통계, JSON 백업/복원, 문제 세트 가져오기.

## 저장 / 동기화
- 1차 저장소는 localStorage (`src/lib/storage.ts`의 `ProgressRepository`)
- claude.ai 아티팩트로 열면 사용자별 비공개 db(`data/users/<id>/progress`, `/history`)와 동기화되어 PC와 폰이 같은 기록을 쓴다 (`src/lib/cloud.ts`)

## 개발
```
npm run dev       # 로컬 개발 서버
npx vitest run    # SRS 테스트
npm run build     # dist/index.html 단일 파일 생성
```
배포: `npm run build` 후 `dist/index.html`을 같은 아티팩트 URL로 다시 게시한다.

## 문항 추가
`src/data/questions.ts`에 추가하거나, 앱의 통계 > 문제 세트 가져오기에서 JSON 배열을 올린다 (형식은 앱 안에 안내).
기본 문항은 기출 유형을 본떠 새로 작성한 오리지널 문항이다. 실제 기출은 PMI 비공개 자료라 포함하지 않았다.
