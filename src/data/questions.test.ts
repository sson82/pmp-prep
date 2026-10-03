import { describe, expect, it } from 'vitest'
import { ECO_WEIGHT } from '../lib/session'
import type { Domain } from '../types'
import { QUESTIONS } from './questions'
import { TOPICS } from './topics'

describe('문제 은행', () => {
  it('id가 중복되지 않는다', () => {
    const ids = QUESTIONS.map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('정답 인덱스·보기별 해설 개수가 올바르다', () => {
    for (const q of QUESTIONS) {
      expect(q.options.length, q.id).toBeGreaterThanOrEqual(4)
      expect(q.answer.length, q.id).toBeGreaterThan(0)
      expect(q.answer.every((a) => a >= 0 && a < q.options.length), q.id).toBe(true)
      if (q.optionNotes) expect(q.optionNotes.length, q.id).toBe(q.options.length)
      expect(q.explanation.length, q.id).toBeGreaterThan(10)
    }
  })

  it('정답 보기만 유독 길지 않다 (최장 오답의 1.6배 이하)', () => {
    const biased = QUESTIONS.filter((q) => q.answer.length === 1).filter((q) => {
      const ans = q.options[q.answer[0]].length
      const longestWrong = Math.max(...q.options.filter((_, i) => i !== q.answer[0]).map((o) => o.length))
      return ans > longestWrong * 1.6
    })
    expect(biased.map((q) => q.id)).toEqual([])
  })

  it('180문항 이상이면 도메인 비율이 ECO(33/41/26)와 ±3%p 이내', () => {
    if (QUESTIONS.length < 180) return
    for (const d of Object.keys(ECO_WEIGHT) as Domain[]) {
      const share = QUESTIONS.filter((q) => q.domain === d).length / QUESTIONS.length
      expect(Math.abs(share - ECO_WEIGHT[d]), d).toBeLessThan(0.03)
    }
  })

  it('모든 문항이 자기 영역의 학습 주제로 분류되어 있다', () => {
    const bad = QUESTIONS.filter((q) => !q.topic || !TOPICS[q.domain].includes(q.topic)).map((q) => q.id)
    expect(bad).toEqual([])
  })
})
