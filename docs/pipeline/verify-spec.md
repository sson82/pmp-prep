# PMP 문항 독립 풀이 (블라인드 검증)

입력 파일의 각 문항(id, stem, options, pick=고를 정답 개수)을 PMP 시험(PMI 마인드셋: 서번트 리더십, 먼저 분석 후 행동, 팀 차원 해결 우선, 통합 변경 통제, 애자일 가치·원칙, PMI 윤리강령, PMBOK 7·8판)에 맞게 직접 푼다.
- 다른 파일(private/questions 등)을 열거나 기존 정답을 찾아보지 말 것. 순수하게 문항만 보고 판단.
- 웹 검색 금지. 문항 원문을 출력 파일 외 어디에도 쓰지 말 것.
- pick 개수만큼 정답 인덱스(0부터)를 고른다.
- confidence: "high" | "mid" | "low".
- reason: 한 문장 근거(한국어).

출력: JSON 배열 [{"id": "...", "answer": [인덱스...], "confidence": "...", "reason": "..."}] 를 지정 경로에 저장. 저장 후 python3로 개수가 입력과 같은지, answer 길이가 pick과 같은지 검증.
최종 보고: 파일 경로, 문항 수, confidence 분포 한 줄.
