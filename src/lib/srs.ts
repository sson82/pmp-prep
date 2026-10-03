import type { CardState, Confidence } from '../types'

const MIN = 60_000
const DAY = 86_400_000
/** 실제 시험 기준 문항당 권장 시간: 230분 / 180문항 ≈ 77초 */
export const TARGET_MS = 77_000

export function newCard(qid: string, now: number): CardState {
  return { qid, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: now, lastAt: 0, wrongCount: 0 }
}

/**
 * SM-2 품질 점수(0~5)를 정답 여부·풀이 시간·자기 확신도로 산출.
 * - 오답: 1 (확신하고 틀린 경우 0 → 잘못된 개념 고착 신호)
 * - 정답이지만 찍었거나 권장 시간의 2배 초과: 3
 * - 일반 정답: 4, 확신 + 권장 시간 이내: 5
 */
export function grade(correct: boolean, ms: number, confidence: Confidence): number {
  if (!correct) return confidence === 'high' ? 0 : 1
  if (confidence === 'low' || ms > TARGET_MS * 2) return 3
  if (confidence === 'high' && ms <= TARGET_MS) return 5
  return 4
}

export function schedule(card: CardState, q: number, now: number): CardState {
  const next = { ...card, lastAt: now }
  if (q < 3) {
    // 재학습: 10분 뒤 다시 노출하고 연속 정답 횟수 초기화
    next.reps = 0
    next.interval = 0
    next.lapses += 1
    next.wrongCount += 1
    next.ease = Math.max(1.3, card.ease - 0.2)
    next.due = now + 10 * MIN
    return next
  }
  next.reps += 1
  if (next.reps === 1) next.interval = 1
  else if (next.reps === 2) next.interval = 3
  else next.interval = Math.round(card.interval * card.ease)
  next.ease = Math.max(1.3, card.ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
  next.due = now + next.interval * DAY
  return next
}
