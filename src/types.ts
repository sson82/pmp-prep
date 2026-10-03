/** ECO(Exam Content Outline) 도메인 */
export type Domain = 'people' | 'process' | 'business'
/** 문항이 근거하는 PMBOK 판: 7판 고유 / 8판 고유 / 공통 */
export type Edition = '7th' | '8th' | 'both'
export type Approach = 'predictive' | 'agile' | 'hybrid'
export type Confidence = 'low' | 'mid' | 'high'

export interface Question {
  id: string
  domain: Domain
  edition: Edition
  approach: Approach
  tags: string[]
  stem: string
  options: string[]
  /** 정답 보기 인덱스. 2개 이상이면 복수 선택 문항 */
  answer: number[]
  explanation: string
  /** 보기별 해설 (왜 맞고 왜 틀린지) */
  optionNotes?: string[]
  /** 7판 vs 8판 관점 차이 포인트 */
  diffNote?: string
}

export interface Attempt {
  qid: string
  at: number
  correct: boolean
  ms: number
  selected: number[]
  confidence: Confidence
  mode: SessionMode
}

export interface CardState {
  qid: string
  ease: number
  /** 다음 복습까지 간격(일) */
  interval: number
  reps: number
  lapses: number
  due: number
  lastAt: number
  wrongCount: number
}

export type SessionMode = 'review' | 'practice' | 'wrong' | 'mock'

export interface Settings {
  dailyNew: number
}

export interface StoreData {
  version: 1
  cards: Record<string, CardState>
  attempts: Attempt[]
  customQuestions: Question[]
  settings: Settings
}

export const DOMAIN_LABEL: Record<Domain, string> = {
  people: 'People (사람)',
  process: 'Process (프로세스)',
  business: 'Business Environment (비즈니스 환경)',
}

export const EDITION_LABEL: Record<Edition, string> = {
  '7th': '7판',
  '8th': '8판',
  both: '공통',
}

export const APPROACH_LABEL: Record<Approach, string> = {
  predictive: '예측형',
  agile: '애자일',
  hybrid: '하이브리드',
}
