import { describe, expect, it } from 'vitest'
import { grade, newCard, schedule, TARGET_MS } from './srs'

const NOW = 1_700_000_000_000
const DAY = 86_400_000

describe('grade', () => {
  it('확신 오답은 0, 일반 오답은 1', () => {
    expect(grade(false, 1000, 'high')).toBe(0)
    expect(grade(false, 1000, 'mid')).toBe(1)
  })
  it('찍은 정답·느린 정답은 3', () => {
    expect(grade(true, 1000, 'low')).toBe(3)
    expect(grade(true, TARGET_MS * 3, 'high')).toBe(3)
  })
  it('빠르고 확신한 정답은 5', () => {
    expect(grade(true, TARGET_MS - 1, 'high')).toBe(5)
    expect(grade(true, TARGET_MS - 1, 'mid')).toBe(4)
  })
})

describe('schedule', () => {
  it('정답이 이어지면 1일 → 3일 → ease 배수로 간격이 늘어난다', () => {
    let c = newCard('q', NOW)
    c = schedule(c, 4, NOW)
    expect(c.interval).toBe(1)
    c = schedule(c, 4, NOW)
    expect(c.interval).toBe(3)
    c = schedule(c, 4, NOW)
    expect(c.interval).toBe(Math.round(3 * 2.5))
    expect(c.due).toBe(NOW + c.interval * DAY)
  })
  it('오답이면 10분 뒤 재노출, lapse·오답 횟수 증가, ease 하락(하한 1.3)', () => {
    let c = schedule(schedule(newCard('q', NOW), 5, NOW), 5, NOW)
    c = schedule(c, 1, NOW)
    expect(c.reps).toBe(0)
    expect(c.due).toBe(NOW + 10 * 60_000)
    expect(c.lapses).toBe(1)
    expect(c.wrongCount).toBe(1)
    for (let i = 0; i < 20; i++) c = schedule(c, 0, NOW)
    expect(c.ease).toBe(1.3)
  })
})
