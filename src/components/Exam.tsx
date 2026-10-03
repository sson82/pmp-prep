import { useState } from 'react'
import { ECO_NOTE } from '../data/editionDiff'
import { buildMock, shuffle } from '../lib/session'
import type { Domain, Question, StoreData } from '../types'
import { DOMAIN_LABEL } from '../types'

const SEC_PER_Q = 80 // 240분 / 180문항

interface Props {
  data: StoreData
  bank: Question[]
  onStart: (title: string, qs: Question[], timeLimitSec?: number) => void
}

/** 실전 문제: 영역·문항 수·시간 제한을 정해 시험처럼 풀고, 끝난 뒤 한꺼번에 채점·해설 */
export function Exam({ data, bank, onStart }: Props) {
  const [domains, setDomains] = useState<Domain[]>(['people', 'process', 'business'])
  const [count, setCount] = useState(20)
  const [timed, setTimed] = useState(true)
  const [ecoRatio, setEcoRatio] = useState(true)
  const [unseenOnly, setUnseenOnly] = useState(false)

  const pool = bank.filter((q) => domains.includes(q.domain) && (!unseenOnly || !data.cards[q.id]))
  const n = Math.min(count, pool.length)
  const allDomains = domains.length === 3

  const start = (qs: Question[], title: string) => onStart(title, qs, timed ? qs.length * SEC_PER_Q : undefined)

  return (
    <div className="card form">
      <h2>실전 문제</h2>
      <p className="muted">시험처럼 푸는 동안에는 정답을 보여 주지 않고, 끝난 뒤 영역별 점수와 전체 해설을 보여 줍니다.</p>

      <fieldset className="field">
        <legend>영역 (여러 개 선택 가능)</legend>
        <div className="toggles">
          {(Object.keys(DOMAIN_LABEL) as Domain[]).map((d) => (
            <button
              key={d}
              className={domains.includes(d) ? 'on' : ''}
              aria-pressed={domains.includes(d)}
              onClick={() => setDomains(domains.includes(d) ? domains.filter((x) => x !== d) : [...domains, d])}
            >
              {DOMAIN_LABEL[d].split(' ')[0]} <span className="muted small">{bank.filter((q) => q.domain === d).length}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <label className="row">
        문항 수
        <input type="number" min={1} max={500} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} />
        <span className="toggles">
          {[10, 20, 50, 100].map((c) => (
            <button key={c} className={count === c ? 'on' : ''} onClick={() => setCount(c)}>
              {c}
            </button>
          ))}
        </span>
      </label>
      <label className="row">
        <input type="checkbox" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
        시간 제한 (문항당 80초 · {Math.round((n * SEC_PER_Q) / 60)}분)
      </label>
      {allDomains && (
        <label className="row">
          <input type="checkbox" checked={ecoRatio} onChange={(e) => setEcoRatio(e.target.checked)} />
          실제 시험 영역 비율로 출제 (People 33 · Process 41 · Business 26)
        </label>
      )}
      <label className="row">
        <input type="checkbox" checked={unseenOnly} onChange={(e) => setUnseenOnly(e.target.checked)} />안 푼 문항만
      </label>

      <button
        className="btn primary"
        disabled={n === 0}
        onClick={() => start(allDomains && ecoRatio ? buildMock(pool, n) : shuffle(pool).slice(0, n), `실전 ${n}문항`)}
      >
        {n}문항 시작
      </button>

      <hr />
      <h3>실전 모의고사</h3>
      <p className="muted">{ECO_NOTE}</p>
      <button className="btn" disabled={bank.length < 180} onClick={() => onStart('실전 모의고사 180', buildMock(bank, 180), 240 * 60)}>
        180문항 · 240분 시작
      </button>
    </div>
  )
}
