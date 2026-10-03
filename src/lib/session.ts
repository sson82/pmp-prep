import type { Approach, Domain, Edition, Question, StoreData } from '../types'
import { accuracy, summarize } from './stats'

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function dueQuestions(data: StoreData, bank: Question[], now = Date.now()): Question[] {
  return bank
    .filter((q) => data.cards[q.id] && data.cards[q.id].due <= now)
    .sort((a, b) => data.cards[a.id].due - data.cards[b.id].due)
}

/**
 * 오늘의 학습 큐: 복습 기한이 지난 문항 전부 + 신규 문항.
 * 신규 문항은 정답률이 낮은 도메인에서 더 많이 뽑는다(가중 무작위).
 */
export function buildReviewQueue(data: StoreData, bank: Question[], now = Date.now()): Question[] {
  const due = dueQuestions(data, bank, now)
  const unseen = shuffle(bank.filter((q) => !data.cards[q.id]))
  const byId = new Map(bank.map((q) => [q.id, q]))
  const { domain } = summarize(data, byId)
  // 풀이 기록이 없는 도메인은 중간 가중치(0.5)
  const weight = (d: Domain) => (domain[d].total ? 1 - accuracy(domain[d]) : 0.5) + 0.15
  const picked: Question[] = []
  const pool = [...unseen]
  while (picked.length < data.settings.dailyNew && pool.length) {
    const total = pool.reduce((s, q) => s + weight(q.domain), 0)
    let r = Math.random() * total
    const idx = pool.findIndex((q) => (r -= weight(q.domain)) <= 0)
    picked.push(...pool.splice(idx === -1 ? pool.length - 1 : idx, 1))
  }
  return [...due, ...picked]
}

export interface PracticeFilter {
  domains: Domain[]
  editions: Edition[]
  approaches: Approach[]
  count: number
  onlyUnseen: boolean
}

export function buildPractice(data: StoreData, bank: Question[], f: PracticeFilter): Question[] {
  const matched = bank.filter(
    (q) =>
      f.domains.includes(q.domain) &&
      f.editions.includes(q.edition) &&
      f.approaches.includes(q.approach) &&
      (!f.onlyUnseen || !data.cards[q.id]),
  )
  return shuffle(matched).slice(0, f.count)
}

export function wrongQuestions(data: StoreData, bank: Question[]): Question[] {
  return bank
    .filter((q) => (data.cards[q.id]?.wrongCount ?? 0) > 0)
    .sort((a, b) => data.cards[b.id].wrongCount - data.cards[a.id].wrongCount)
}

/** ECO 비중(People 33 / Process 41 / Business 26)에 맞춘 모의고사 구성 */
export const ECO_WEIGHT: Record<Domain, number> = { people: 0.33, process: 0.41, business: 0.26 }

export function buildMock(bank: Question[], count: number): Question[] {
  const out: Question[] = []
  for (const d of Object.keys(ECO_WEIGHT) as Domain[]) {
    out.push(...shuffle(bank.filter((q) => q.domain === d)).slice(0, Math.round(count * ECO_WEIGHT[d])))
  }
  return shuffle(out)
}
