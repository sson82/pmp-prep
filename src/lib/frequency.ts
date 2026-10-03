import type { Question } from '../types'

export type FreqLevel = '상' | '중' | '하'

/** 주제별 문항 수로 출제 빈도를 상/중/하로 나눈다 (전체 주제 분포의 3분위 기준) */
export function topicFrequency(bank: Question[]): Map<string, { count: number; level: FreqLevel }> {
  const counts = new Map<string, number>()
  for (const q of bank) if (q.topic) counts.set(q.topic, (counts.get(q.topic) ?? 0) + 1)
  const sorted = [...counts.values()].sort((a, b) => a - b)
  const hi = sorted[Math.floor(sorted.length * (2 / 3))] ?? 0
  const lo = sorted[Math.floor(sorted.length / 3)] ?? 0
  return new Map([...counts].map(([t, c]) => [t, { count: c, level: c >= hi ? '상' : c > lo ? '중' : '하' }]))
}
