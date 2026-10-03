import type { Attempt, Domain, Edition, Question, StoreData } from '../types'

export interface Bucket {
  total: number
  correct: number
  ms: number
}

const emptyBucket = (): Bucket => ({ total: 0, correct: 0, ms: 0 })
const add = (b: Bucket, a: Attempt) => {
  b.total += 1
  b.correct += a.correct ? 1 : 0
  b.ms += a.ms
}

export const accuracy = (b: Bucket) => (b.total ? b.correct / b.total : 0)
export const avgSec = (b: Bucket) => (b.total ? b.ms / b.total / 1000 : 0)

/** 최근 풀이 기준 도메인·판·태그별 집계 */
export function summarize(data: StoreData, byId: Map<string, Question>, recent = 300) {
  const domain: Record<Domain, Bucket> = { people: emptyBucket(), process: emptyBucket(), business: emptyBucket() }
  const edition: Record<Edition, Bucket> = { '7th': emptyBucket(), '8th': emptyBucket(), both: emptyBucket() }
  const tags = new Map<string, Bucket>()
  const all = emptyBucket()
  for (const a of data.attempts.slice(-recent)) {
    const q = byId.get(a.qid)
    if (!q) continue
    add(all, a)
    add(domain[q.domain], a)
    add(edition[q.edition], a)
    for (const t of q.tags) {
      if (!tags.has(t)) tags.set(t, emptyBucket())
      add(tags.get(t)!, a)
    }
  }
  const weakTags = [...tags.entries()]
    .filter(([, b]) => b.total >= 2)
    .sort((x, y) => accuracy(x[1]) - accuracy(y[1]))
    .slice(0, 6)
  return { all, domain, edition, weakTags }
}

/** 연속 학습 일수 (오늘 또는 어제까지 이어진 경우) */
export function streakDays(attempts: Attempt[], now = Date.now()): number {
  const days = new Set(attempts.map((a) => new Date(a.at).toDateString()))
  let n = 0
  const d = new Date(now)
  if (!days.has(d.toDateString())) d.setDate(d.getDate() - 1)
  while (days.has(d.toDateString())) {
    n += 1
    d.setDate(d.getDate() - 1)
  }
  return n
}

export function todayCount(attempts: Attempt[], now = Date.now()): number {
  const today = new Date(now).toDateString()
  return attempts.filter((a) => new Date(a.at).toDateString() === today).length
}
