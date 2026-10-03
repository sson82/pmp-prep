import type { Question } from '../types'

/**
 * 문제 은행: src/data/generated/*.json 을 모두 합친다.
 * - base.json: 초기 40문항 (7판/8판/공통)
 * - people/process-a/process-b/business.json: 2026 ECO 비율(33/41/26)에 맞춰 추가한 8판 기준 문항
 * 실제 PMP 기출은 PMI 비공개 자료이므로, 모두 기출 유형을 본떠 새로 작성한 오리지널 문항이다.
 */
const GENERATED = Object.values(import.meta.glob<Question[]>('./generated/*.json', { eager: true, import: 'default' })).flat()

export const QUESTIONS: Question[] = GENERATED
