import { useEffect, useMemo, useRef, useState } from 'react'
import type { FreqLevel } from '../lib/frequency'
import { shuffle } from '../lib/session'
import { Insight } from './Insight'
import type { Attempt, Confidence, Question, SessionMode } from '../types'
import { APPROACH_LABEL, DOMAIN_LABEL, EDITION_LABEL } from '../types'

interface Result {
  q: Question
  selected: number[]
  correct: boolean
  ms: number
}

interface Props {
  title: string
  questions: Question[]
  mode: SessionMode
  /** 모의고사 제한 시간(초). 지정하면 시간 종료 시 자동 채점 */
  timeLimitSec?: number
  onRecord: (q: Question, a: Omit<Attempt, 'qid' | 'at'>) => void
  onExit: () => void
  /** 세션 키: 기록에 남겨 회차별 점수 추이를 만든다 */
  sid: number
  freq: Map<string, { count: number; level: FreqLevel }>
}

const sameSet = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x))
const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`

export function Quiz({ title, questions, mode, timeLimitSec, onRecord, onExit, sid, freq }: Props) {
  const isMock = mode === 'mock'
  const [queue, setQueue] = useState(questions)
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [confidence, setConfidence] = useState<Confidence>('mid')
  const [submitted, setSubmitted] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [ended, setDone] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [startedAt] = useState(() => Date.now())
  const shownAt = useRef(0)
  const requeued = useRef(new Set<string>())

  const q = queue[idx]
  const order = useMemo(() => (q ? shuffle(q.options.map((_, i) => i)) : []), [q])
  const multi = q ? q.answer.length > 1 : false
  const remaining = timeLimitSec ? timeLimitSec - (now - startedAt) / 1000 : undefined
  const done = ended || (remaining !== undefined && remaining <= 0)

  useEffect(() => {
    shownAt.current = Date.now()
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const toggle = (i: number) => {
    if (submitted) return
    if (multi) setSelected((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]))
    else setSelected([i])
  }

  const submit = () => {
    if (!q || selected.length === 0 || submitted) return
    const ms = Date.now() - shownAt.current
    const correct = sameSet(selected, q.answer)
    onRecord(q, { correct, ms, selected, confidence, mode, sid })
    setResults((r) => [...r, { q, selected, correct, ms }])
    // 학습 모드에서 틀린 문항은 세션 끝에 한 번 더 출제(즉시 재학습)
    if (!correct && !isMock && !requeued.current.has(q.id)) {
      requeued.current.add(q.id)
      setQueue((qs) => [...qs, q])
    }
    if (isMock) next()
    else setSubmitted(true)
  }

  // 재출제는 학습 모드의 제출 시점에만 일어나고 '다음'은 그 뒤 렌더에서 눌리므로 queue는 최신이다
  const next = () => (idx + 1 >= queue.length ? setDone(true) : advance())

  const advance = () => {
    setIdx((i) => i + 1)
    setSelected([])
    setConfidence('mid')
    setSubmitted(false)
    shownAt.current = Date.now()
  }

  // 키보드: 1~5 보기 선택, Enter 제출/다음
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done || !q) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const n = Number(e.key)
      if (n >= 1 && n <= order.length) toggle(order[n - 1])
      else if (e.key === 'Enter') {
        if (submitted) next()
        else submit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (questions.length === 0) {
    return (
      <div className="card empty">
        <p>조건에 맞는 문항이 없습니다.</p>
        <button className="btn" onClick={onExit}>
          돌아가기
        </button>
      </div>
    )
  }

  if (done || !q) return <Summary title={title} results={results} isMock={isMock} onExit={onExit} freq={freq} />

  const correctNow = submitted && sameSet(selected, q.answer)

  return (
    <div className="quiz">
      <div className="quiz-head">
        <button className="link" onClick={() => (results.length && !confirm('세션을 끝내고 결과를 볼까요?') ? null : setDone(true))}>
          ✕ 종료
        </button>
        <span className="muted">{title}</span>
        <span className="mono">
          {idx + 1} / {queue.length}
          {remaining !== undefined && <span className={remaining < 300 ? 'warn' : ''}> · ⏱ {fmt(Math.max(0, remaining))}</span>}
        </span>
      </div>
      <div className="progress">
        <div style={{ width: `${(idx / queue.length) * 100}%` }} />
      </div>

      <article className="card">
        <div className="chips">
          <span className="chip">{DOMAIN_LABEL[q.domain].split(' ')[0]}</span>
          <span className={`chip ed-${q.edition}`}>{EDITION_LABEL[q.edition]}</span>
          <span className="chip">{APPROACH_LABEL[q.approach]}</span>
          {multi && <span className="chip warn">복수 선택 ({q.answer.length}개)</span>}
        </div>
        <p className="stem">{q.stem}</p>

        <ol className="options">
          {order.map((oi, pos) => {
            const picked = selected.includes(oi)
            const isAns = q.answer.includes(oi)
            const cls = ['opt', picked && 'picked', submitted && isAns && 'right', submitted && picked && !isAns && 'wrong']
              .filter(Boolean)
              .join(' ')
            return (
              <li key={oi}>
                <button className={cls} onClick={() => toggle(oi)} disabled={submitted}>
                  <span className="key">{pos + 1}</span>
                  <span className="opt-text">
                    {q.options[oi]}
                    {submitted && q.optionNotes?.[oi] && <span className="note">{q.optionNotes[oi]}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ol>

        {!submitted ? (
          <div className="submit-row">
            <div className="seg" role="radiogroup" aria-label="확신도">
              {(
                [
                  ['low', '헷갈림'],
                  ['mid', '보통'],
                  ['high', '확신'],
                ] as const
              ).map(([v, label]) => (
                <button key={v} role="radio" aria-checked={confidence === v} className={confidence === v ? 'on' : ''} onClick={() => setConfidence(v)}>
                  {label}
                </button>
              ))}
            </div>
            <button className="btn primary" disabled={selected.length === 0} onClick={submit}>
              {isMock ? '다음' : '제출'}
            </button>
          </div>
        ) : (
          <div className={`feedback ${correctNow ? 'ok' : 'ng'}`}>
            <strong>{correctNow ? '정답입니다' : '오답입니다'}</strong>
            {!correctNow && <span className="muted"> · 오답노트에 추가했고, 이 세션 끝에 한 번 더 나옵니다</span>}
            <p>{q.explanation}</p>
            <Insight q={q} freq={q.topic ? freq.get(q.topic) : undefined} />
            <button className="btn primary" onClick={next}>
              다음 →
            </button>
          </div>
        )}
      </article>
    </div>
  )
}

function Summary({
  title,
  results,
  isMock,
  onExit,
  freq,
}: {
  title: string
  results: Result[]
  isMock: boolean
  onExit: () => void
  freq: Map<string, { count: number; level: FreqLevel }>
}) {
  // 재출제 문항은 첫 시도만 점수에 반영
  const first = results.filter((r, i) => results.findIndex((x) => x.q.id === r.q.id) === i)
  const correct = first.filter((r) => r.correct).length
  const pct = first.length ? Math.round((correct / first.length) * 100) : 0
  const avg = first.length ? first.reduce((s, r) => s + r.ms, 0) / first.length / 1000 : 0
  const wrong = first.filter((r) => !r.correct)
  const [open, setOpen] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const list = showAll ? first : wrong
  const byDomain = (Object.keys(DOMAIN_LABEL) as Question['domain'][])
    .map((d) => {
      const rs = first.filter((r) => r.q.domain === d)
      return { d, n: rs.length, ok: rs.filter((r) => r.correct).length }
    })
    .filter((x) => x.n > 0)

  return (
    <div className="summary">
      <div className="card center">
        <p className="muted">{title} 결과</p>
        <p className="big">{pct}%</p>
        <p>
          {correct} / {first.length} 정답 · 문항당 평균 {avg.toFixed(0)}초
        </p>
        {isMock && <p className={pct >= 70 ? 'ok-text' : 'warn'}>{pct >= 70 ? '목표 정답률(70%) 이상입니다' : '목표 정답률 70%에 못 미쳤습니다. 오답노트를 복습하세요'}</p>}
        <div className="domain-scores">
          {byDomain.map(({ d, n, ok }) => (
            <span key={d}>
              {DOMAIN_LABEL[d].split(' ')[0]} <b>{Math.round((ok / n) * 100)}%</b> <span className="muted">({ok}/{n})</span>
            </span>
          ))}
        </div>
        <button className="btn primary" onClick={onExit}>
          홈으로
        </button>
      </div>
      {first.length > 0 && (
        <div className="card">
          <div className="row between">
            <h3>{showAll ? `전체 문항 해설 (${first.length})` : `틀린 문항 해설 (${wrong.length})`}</h3>
            <button className="link" onClick={() => setShowAll(!showAll)}>
              {showAll ? '틀린 문항만' : '전체 보기'}
            </button>
          </div>
          <ul className="review-list">
            {list.map((r) => (
              <li key={r.q.id}>
                <button className="link left" onClick={() => setOpen(open === r.q.id ? null : r.q.id)}>
                  <span className={r.correct ? 'ok-text' : 'wrong-text'}>{r.correct ? '○' : '✕'}</span> {r.q.stem}
                </button>
                {open === r.q.id && (
                  <div className="review-body">
                    <p>
                      내 답: <span className={r.correct ? 'ok-text' : 'wrong-text'}>{r.selected.map((i) => r.q.options[i]).join(', ')}</span>
                    </p>
                    <p>
                      정답: <span className="ok-text">{r.q.answer.map((i) => r.q.options[i]).join(', ')}</span>
                    </p>
                    <p>{r.q.explanation}</p>
                    <Insight q={r.q} freq={r.q.topic ? freq.get(r.q.topic) : undefined} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
