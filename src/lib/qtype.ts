import type { Question } from '../types'

export interface QType {
  label: string
  /** 이 유형을 푸는 요령 */
  hint: string
}

const CALC = /(CPI|SPI|EAC|ETC|VAC|TCPI|BAC|EMV|PERT|여유|채널|NPV|BCR|투자회수|사이클 타임|리틀|속도.*스프린트|얼마|몇 [일개주명])/
const TABLE = /(\|.*\||표와 같|아래 표|다음 표|그래프|차트|다이어그램)/

/** 지문·태그로 문제 유형을 판별한다 (형식 + 묻는 방식) */
export function questionTypes(q: Question): QType[] {
  const s = q.stem
  const out: QType[] = []
  // 형식
  if (q.tags.includes('사례형') || s.startsWith('[사례')) out.push({ label: '사례형', hint: '사례 본문에서 단계·제약·이해관계자를 먼저 표시하고, 이 문항이 묻는 시점의 상황만 골라 판단한다.' })
  if (q.answer.length > 1) out.push({ label: `복수 선택(${q.answer.length}개)`, hint: '보기마다 독립적으로 참/거짓을 판단한다. 개수만 맞추려고 애매한 보기를 끼워 넣지 않는다.' })
  if (/짝지어|짝 지어|연결된 것|올바르게 연결/.test(s)) out.push({ label: '짝 맞추기', hint: '확실한 짝부터 확정해 보기를 소거하면 나머지가 자동으로 정해진다.' })
  if (TABLE.test(s)) out.push({ label: '표·그래프 해석', hint: '수치를 계산하기 전에 축·단위·기준선을 먼저 확인한다.' })
  if (q.tags.some((t) => /계산|EVM|EMV|PERT/.test(t)) || CALC.test(s)) out.push({ label: '계산형', hint: '공식을 적고 숫자를 대입한 뒤, 결과가 상황 해석(초과/지연 등)과 맞는지 다시 확인한다.' })
  // 묻는 방식
  if (/가장 먼저|우선적으로|첫 번째로|먼저 해야/.test(s)) out.push({ label: '우선순위형 (FIRST)', hint: '"가장 먼저"는 대개 상황 파악·분석·당사자와 대화가 답. 바로 에스컬레이션·변경·교체하는 보기는 오답 패턴.' })
  else if (/다음에|그 다음|다음 단계|NEXT/i.test(s)) out.push({ label: '다음 단계형 (NEXT)', hint: '지문에서 이미 끝난 단계를 확인하고, 절차상 바로 다음 단계를 고른다.' })
  else if (/가장 적절|가장 좋은|최선|BEST/i.test(s)) out.push({ label: '최선 조치형 (BEST)', hint: '여러 보기가 다 그럴듯하면 PMI 원칙(서번트 리더십·가치·통합 변경 통제·윤리)에 가장 부합하는 것을 고른다.' })
  else if (/무엇인가|무엇인지|어느 것|해당하는 것|의미|정의/.test(s) && !out.some((t) => t.label === '계산형'))
    out.push({ label: '개념 확인형', hint: '용어의 정의와 쓰임을 정확히 구분한다. 비슷한 용어(예: 범위 확인 vs 품질 통제)를 대비해 기억한다.' })
  if (!out.length) out.push({ label: '상황 판단형', hint: '지문 속 역할·개발 방식·프로젝트 단계를 확인하고 PMI 마인드셋으로 판단한다.' })
  return out
}
