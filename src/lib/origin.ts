import type { Question } from '../types'

/** 8판(2026 개정 시험) 기준으로 새로 작성한 문항 — id 접두사 o8- */
export const isNew8 = (q: Question) => q.id.startsWith('o8-')
