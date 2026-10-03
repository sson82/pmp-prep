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
    for (const t of q.topic ? [q.topic] : q.tags) {
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

const dayKey = (t: number) => {
  const d = new Date(t)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/** 날짜별 정답률(%) — 전체와 영역별. 영역은 그날 3문항 이상 푼 경우만 점을 찍는다 */
export function dailyTrend(data: StoreData, byId: Map<string, Question>, maxDays = 30) {
  const days: string[] = []
  const buckets = new Map<string, { all: Bucket; domain: Record<Domain, Bucket> }>()
  for (const a of data.attempts) {
    const q = byId.get(a.qid)
    if (!q) continue
    const k = dayKey(a.at)
    if (!buckets.has(k)) {
      days.push(k)
      buckets.set(k, { all: emptyBucket(), domain: { people: emptyBucket(), process: emptyBucket(), business: emptyBucket() } })
    }
    const b = buckets.get(k)!
    add(b.all, a)
    add(b.domain[q.domain], a)
  }
  const labels = days.slice(-maxDays)
  const pct = (b: Bucket, min: number) => (b.total >= min ? Math.round(accuracy(b) * 100) : null)
  return {
    labels,
    all: labels.map((k) => pct(buckets.get(k)!.all, 1)),
    domain: (['people', 'process', 'business'] as Domain[]).reduce(
      (acc, d) => ({ ...acc, [d]: labels.map((k) => pct(buckets.get(k)!.domain[d], 3)) }),
      {} as Record<Domain, (number | null)[]>,
    ),
  }
}

/** 실전 회차별 점수 (mode 'mock' 기록을 세션 키로 묶음) */
export function examHistory(data: StoreData, byId: Map<string, Question>) {
  const sessions = new Map<number, { at: number; all: Bucket; domain: Record<Domain, Bucket> }>()
  for (const a of data.attempts) {
    if (a.mode !== 'mock' || !a.sid) continue
    const q = byId.get(a.qid)
    if (!q) continue
    if (!sessions.has(a.sid)) sessions.set(a.sid, { at: a.at, all: emptyBucket(), domain: { people: emptyBucket(), process: emptyBucket(), business: emptyBucket() } })
    const s = sessions.get(a.sid)!
    add(s.all, a)
    add(s.domain[q.domain], a)
  }
  return [...sessions.values()].sort((a, b) => a.at - b.at)
}
