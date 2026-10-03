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
  /** 학습 체계 분류용 대표 주제 (src/data/topics.ts) */
  topic?: string
  /** 문제 의도: 이 문제가 확인하려는 역량 */
  intent?: string
  /** 바라보는 관점: PMI가 기대하는 판단 방식 */
  perspective?: string
  /** 풀이 팁: 함정 보기·키워드 */
  tip?: string
  /** 출처 (예: 'ITPE 2021.07 모의고사 #12') */
  source?: string
  /** 정답 근거: 'official' 원본 정답 / 'ai' AI 풀이(두 번 독립 풀이 일치) / 'review' 풀이 불일치로 검토 필요 */
  answerBasis?: 'official' | 'ai' | 'review'
}

export interface Attempt {
  qid: string
  at: number
  correct: boolean
  ms: number
  selected: number[]
  confidence: Confidence
  mode: SessionMode
  /** 같은 세션(한 번의 풀이 묶음)을 구분하는 키. 실전 회차별 점수 추이에 사용 */
  sid?: number
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
