import { useState } from 'react'
import type { FreqLevel } from '../lib/frequency'
import type { Domain, Question, StoreData } from '../types'
import { DOMAIN_LABEL } from '../types'
import { Insight } from './Insight'

type Filter = 'all' | 'confident' | 'due' | Domain

interface Props {
  data: StoreData
  questions: Question[]
  freq: Map<string, { count: number; level: FreqLevel }>
  onRetry: (title: string, qs: Question[]) => void
}

/** 오답 관리: 틀린 문항 누적 · 영역/주제 필터 · 확신 오답 · 복습 예정 */
export function Wrong({ data, questions, freq, onRetry }: Props) {
  const [open, setOpen] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [topic, setTopic] = useState('')

  if (questions.length === 0) {
    return (
      <div className="card empty">
        <h2>오답 관리</h2>
        <p className="muted">아직 틀린 문항이 없습니다. 틀린 문항은 여기에 자동으로 쌓이고, 복습 주기에 맞춰 다시 출제됩니다.</p>
      </div>
    )
  }

  // 확신하고 틀린 적이 있는 문항: 잘못 알고 있는 개념 신호
  const confidentWrong = new Set(data.attempts.filter((a) => !a.correct && a.confidence === 'high').map((a) => a.qid))
  const now = Date.now()
  const byFilter = questions.filter((q) =>
    filter === 'all' ? true : filter === 'confident' ? confidentWrong.has(q.id) : filter === 'due' ? data.cards[q.id].due <= now : q.domain === filter,
  )
  const topics = [...new Set(byFilter.map((q) => q.topic).filter(Boolean))] as string[]
  const shown = topic ? byFilter.filter((q) => q.topic === topic) : byFilter
  const lastWrong = (id: string) => [...data.attempts].reverse().find((a) => a.qid === id && !a.correct)
  const chips: [Filter, string, number][] = [
    ['all', '전체', questions.length],
    ['due', '복습 예정', questions.filter((q) => data.cards[q.id].due <= now).length],
    ['confident', '확신했는데 틀림', questions.filter((q) => confidentWrong.has(q.id)).length],
    ...(Object.keys(DOMAIN_LABEL) as Domain[]).map((d) => [d, DOMAIN_LABEL[d].split(' ')[0], questions.filter((q) => q.domain === d).length] as [Filter, string, number]),
  ]

  return (
    <div className="card">
      <div className="row between">
        <h2>오답 관리</h2>
        <button className="btn primary" disabled={shown.length === 0} onClick={() => onRetry('오답 다시 풀기', shown)}>
          {shown.length}문항 다시 풀기
        </button>
      </div>
      <div className="toggles">
        {chips.map(([f, label, n]) => (
          <button
            key={f}
            className={filter === f ? 'on' : ''}
            onClick={() => {
              setFilter(f)
              setTopic('')
            }}
          >
            {label} <span className="muted small">{n}</span>
          </button>
        ))}
      </div>
      {topics.length > 1 && (
        <select className="select" value={topic} onChange={(e) => setTopic(e.target.value)}>
          <option value="">모든 주제</option>
          {topics.map((t) => (
            <option key={t} value={t}>
              {t} ({byFilter.filter((q) => q.topic === t).length})
            </option>
          ))}
        </select>
      )}
      {filter === 'confident' && <p className="muted small">확신하고 틀린 문항은 개념을 잘못 알고 있다는 신호입니다. 해설과 관점을 먼저 읽고 다시 푸세요.</p>}
      <ul className="review-list">
        {shown.map((q) => {
          const c = data.cards[q.id]
          const lw = lastWrong(q.id)
          return (
            <li key={q.id}>
              <button className="link left" onClick={() => setOpen(open === q.id ? null : q.id)}>
                <span className="badge">{c.wrongCount}회</span> {q.stem}
              </button>
              {open === q.id && (
                <div className="review-body">
                  {lw && (
                    <p>
                      최근 오답: <span className="wrong-text">{lw.selected.map((i) => q.options[i]).join(', ')}</span>
                    </p>
                  )}
                  <p>
                    정답: <span className="ok-text">{q.answer.map((i) => q.options[i]).join(', ')}</span>
                  </p>
                  <p>{q.explanation}</p>
                  <Insight q={q} freq={q.topic ? freq.get(q.topic) : undefined} />
                  <button className="btn" onClick={() => onRetry('오답 다시 풀기', [q])}>
                    이 문항 다시 풀기
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
