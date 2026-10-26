import type { Domain } from '../types'
import { ECO_TASKS } from './eco'

/**
 * 영역별 분류 학습 체계: 영역 → 2026 ECO 공식 과제(26개).
 * 문항의 topic 값은 이 목록 중 하나다. (이전 세부 주제는 tags에 보존)
 */
export const TOPICS: Record<Domain, string[]> = {
  people: ECO_TASKS.filter((t) => t.domain === 'people').map((t) => t.ko),
  process: ECO_TASKS.filter((t) => t.domain === 'process').map((t) => t.ko),
  business: ECO_TASKS.filter((t) => t.domain === 'business').map((t) => t.ko),
}
