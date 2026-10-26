# ITPE 학원 문제 변환 명세

입력: private/_out/ 의 추출 텍스트(사용자가 구매한 ITPE 학원 PMP 7판 수험자료). 출력: private/questions/<배치>.json (git·외부 업로드 금지, 개인 학습용 비공개 DB에만 사용).
웹 검색 금지. 원문 문항을 다른 곳에 출력·요약하지 말고 지정된 파일에만 쓸 것.

## 할 일 (문항마다)
1. 텍스트에서 문항 번호·지문·보기를 정확히 파싱. PDF 추출로 생긴 줄바꿈/공백 깨짐만 정리하고 내용은 바꾸지 말 것. 머리글("제 3자에게 공유/유포를 절대 금합니다." 등)은 제거.
   - 드래그앤드롭·주관식·보기가 4개 미만이거나 그림이 필요해 텍스트만으로 풀 수 없는 문항은 건너뛰고 최종 보고에 번호만 적기.
   - "2개 고르시오" 등 복수 선택은 answer에 여러 인덱스.
2. 정답: 원본에 정답이 있으면 그대로 쓰고 answerBasis "official". 없으면 PMI 마인드셋(PMBOK 7판 원칙·애자일 가치, ECO, PMI 윤리강령)으로 직접 풀어 answerBasis "ai". 확신이 낮으면 explanation 끝에 "(검토 권장)"을 붙이지 말고 그대로 두되 최종 보고에 번호를 적을 것.
3. 2026년 7월 개정 시험(PMBOK 8판 기준) 관점 반영:
   - 8판 사실: 6원칙(전체론적 관점 채택, 가치에 집중, 프로세스와 인도물에 품질 내재화, 책임 있는 리더가 되라, 모든 프로젝트 영역에 지속가능성 통합, 권한 위임 문화 구축), 7성과 영역(거버넌스, 범위, 일정, 재무, 이해관계자, 자원, 리스크), 5중점 영역(착수·기획·실행·감시및통제·종료), 40개 프로세스. 이외의 8판 세부는 지어내지 말 것.
   - 7판 고유 용어(8개 성과 영역 이름, 12원칙 명칭, 가치 인도 시스템 등)를 직접 묻는 문항이면 diffNote에 "8판에서는 ~"으로 바뀐 점을 적고 edition "7th". 판과 무관한 일반 PM 판단 문항이면 edition "both". 8판에서 정답 논리가 달라질 수 있으면 diffNote에 명시.
4. 필드 작성 (모두 한국어, 간결하게):
   - explanation: 2~3문장. 왜 정답인지 + 핵심 원리.
   - optionNotes: 보기 순서대로 각 보기가 맞는/틀린 이유 한 문장.
   - intent: 이 문제가 확인하려는 역량 1문장 (예: "이슈 발생 시 PM이 먼저 분석하는지, 바로 에스컬레이션하는지를 본다").
   - perspective: PMI가 이런 상황을 바라보는 관점 1~2문장 (예: "서번트 리더는 지시보다 팀의 자기조직화를 돕는다").
   - tip: 풀이 팁 1문장 (키워드, 함정 보기 유형. 예: "'즉시', '스폰서에게 보고'가 들어간 보기는 대개 오답").
   - domain: people | process | business (2026 ECO 기준).
   - topic / eco: 2026 ECO 공식 과제 이름(ko)과 코드. 과제 정의 `docs/pipeline/eco-2026-tasks.txt`, 분류 규칙 `docs/pipeline/eco-classify-spec.md`. domain은 과제 영역을 따른다(P→people, R→process, B→business). 세부 주제(예: 갈등관리, EVM)는 tags에.
     people: P1 공동 비전 수립, P2 갈등 관리, P3 프로젝트 팀 리딩, P4 이해관계자 참여, P5 이해관계자 기대 정렬, P6 이해관계자 기대 관리, P7 지식 이전, P8 의사소통 계획·관리
     process: R1 통합 계획·인도 방식, R2 범위 개발·관리, R3 가치 기반 인도, R4 자원 계획·관리, R5 조달 계획·관리, R6 재무 계획·관리, R7 품질 계획·최적화, R8 일정 계획·관리, R9 프로젝트 상태 평가, R10 프로젝트 종료
     business: B1 거버넌스 수립, B2 규정 준수, B3 변경 관리·통제, B4 장애물 제거·이슈 관리, B5 리스크 계획·관리, B6 지속적 개선, B7 조직 변화 지원, B8 외부 환경 변화 평가
   - tags: 세부 키워드 1~3개.
   - approach: predictive | agile | hybrid.
   - source: 예 "ITPE 2021.07 모의고사 #12".
   - id: "itpe-<배치코드>-<원문번호 3자리>" (예 itpe-2107-012).

## 출력 형식
JSON 배열 하나 (UTF-8, 2칸 들여쓰기). 키: id, domain, edition, approach, topic, eco, tags, stem, options, answer, explanation, optionNotes, intent, perspective, tip, diffNote(선택), source, answerBasis.
저장 후 python3로 검증: JSON 파싱, id 중복 없음, answer 범위, optionNotes 길이 == options 길이, topic이 목록 안에 있음, 필수 필드 존재. 통과할 때까지 수정.

## 최종 보고 (짧게)
파일 경로, 변환 문항 수, 건너뛴 번호(사유), 정답 확신이 낮은 번호, domain/topic 분포 한 줄. 문항 원문은 보고에 쓰지 말 것.
