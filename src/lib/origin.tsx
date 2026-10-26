import type { Question } from '../types'

/** 문항 출처 */
export type Origin = 'o8' | 'orig' | 'itpe' | 'custom'

export const originOf = (q: Question): Origin =>
  q.id.startsWith('o8-') ? 'o8' : q.id.startsWith('itpe-') ? 'itpe' : q.id.startsWith('u-') ? 'custom' : 'orig'

/** 8판(2026 개정 시험) 기준으로 새로 작성한 문항 */
export const isNew8 = (q: Question) => originOf(q) === 'o8'
/** 직접 작성한 오리지널 문항(8판 포함) */
export const isOriginal = (q: Question) => ['o8', 'orig'].includes(originOf(q))
export const isAcademy = (q: Question) => originOf(q) === 'itpe'

export type SourceFilter = 'all' | 'original' | 'new8' | 'academy'
export const SOURCE_FILTERS: [SourceFilter, string][] = [
  ['all', '전체'],
  ['original', '오리지널'],
  ['new8', '8판'],
  ['academy', '학원'],
]
export const matchSource = (q: Question, f: SourceFilter) =>
  f === 'all' || (f === 'original' && isOriginal(q)) || (f === 'new8' && isNew8(q)) || (f === 'academy' && isAcademy(q))

/** 출처 배지 (오리지널 · 8판 · 학원) */
export function SourceBadges({ q }: { q: Question }) {
  return (
    <>
      {isOriginal(q) && <span className="chip orig">오리지널</span>}
      {isNew8(q) && <span className="chip new8">8판</span>}
      {isAcademy(q) && <span className="chip academy">학원</span>}
    </>
  )
}
