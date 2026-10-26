import { useState } from 'react'
import { TASK_BY_KO } from '../data/eco'
import { TOPICS } from '../data/topics'
import type { FreqLevel } from '../lib/frequency'
import { matchSource, SOURCE_FILTERS, type SourceFilter } from '../lib/origin'
import type { Domain, Question, StoreData } from '../types'
import { DOMAIN_LABEL } from '../types'

interface Props {
  data: StoreData
  bank: Question[]
  freq: Map<string, { count: number; level: FreqLevel }>
  onStudy: (title: string, qs: Question[]) => void
  onCompare: () => void
}

/** 문제 학습: 영역 → 주제 체계로 진도·정답률·출제 빈도를 보고 주제 단위로 공부한다 */
export function Learn({ data, bank, freq, onStudy, onCompare }: Props) {
  const [open, setOpen] = useState<Domain>('people')
  const [unseenOnly, setUnseenOnly] = useState(false)
  const [source, setSource] = useState<SourceFilter>('all')

  const stat = (qs: Question[]) => {
    const seen = qs.filter((q) => data.cards[q.id]).length
    const ids = new Set(qs.map((q) => q.id))
    const at = data.attempts.filter((a) => ids.has(a.qid))
    const acc = at.length ? Math.round((at.filter((a) => a.correct).length / at.length) * 100) : null
    return { seen, acc }
  }
  const pick = (qs: Question[]) => qs.filter((q) => (!unseenOnly || !data.cards[q.id]) && matchSource(q, source))
  // 표시용 문항 집합: 출처 필터를 고르면 그 출처 문항만 세고 진도도 그 기준으로 본다
  const scope = (qs: Question[]) => qs.filter((q) => matchSource(q, source))
  const untagged = bank.filter((q) => !q.topic)

  return (
    <div className="learn">
      <div className="card">
        <div className="row between">
          <h2>문제 학습</h2>
          <span className="row">
            <select className="select compact" value={source} onChange={(e) => setSource(e.target.value as SourceFilter)} aria-label="출처">
              {SOURCE_FILTERS.map(([v, label]) => (
                <option key={v} value={v}>
                  출처: {label} ({bank.filter((q) => matchSource(q, v)).length})
                </option>
              ))}
            </select>
            <label className="row small">
              <input type="checkbox" checked={unseenOnly} onChange={(e) => setUnseenOnly(e.target.checked)} />안 푼 문항만
            </label>
          </span>
        </div>
        <p className="muted">PMI 공식 2026 시험 출제 범위(ECO)의 26개 과제별로 공부합니다. 과제를 고르면 한 문제씩 풀고 해설·문제 의도·출제 빈도·관점·팁을 바로 확인합니다.</p>
        <div className="seg wide" role="tablist">
          {(Object.keys(TOPICS) as Domain[]).map((d) => (
            <button key={d} role="tab" aria-selected={open === d} className={open === d ? 'on' : ''} onClick={() => setOpen(d)}>
              {DOMAIN_LABEL[d].split(' ')[0]}
            </button>
          ))}
        </div>
        {(() => {
          const all = scope(bank.filter((q) => q.domain === open))
          const s = stat(all)
          return (
            <button className="topic all" onClick={() => onStudy(`${DOMAIN_LABEL[open].split(' ')[0]} 전체`, pick(all))} disabled={pick(all).length === 0}>
              <span>
                <b>{DOMAIN_LABEL[open]} 전체</b>
                <span className="muted small"> {all.length}문항</span>
              </span>
              <span className="muted small">
                진도 {s.seen}/{all.length}
                {s.acc !== null && ` · 정답률 ${s.acc}%`}
              </span>
            </button>
          )
        })()}
        <ul className="topics">
          {TOPICS[open].map((t) => {
            const qs = scope(bank.filter((q) => q.domain === open && q.topic === t))
            if (qs.length === 0) return null
            const s = stat(qs)
            const f = freq.get(t)
            return (
              <li key={t}>
                <button className="topic" onClick={() => onStudy(t, pick(qs))} disabled={pick(qs).length === 0}>
                  <span>
                    {f && <span className={`freq freq-${f.level}`}>{f.level}</span>} <span className="eco-code">{TASK_BY_KO.get(t)?.code}</span> {t}
                    <span className="muted small"> {qs.length}문항</span>
                  </span>
                  <span className="topic-meta">
                    <span className="muted small">
                      {s.seen}/{qs.length}
                      {s.acc !== null && ` · ${s.acc}%`}
                    </span>
                    <span className="mini-track">
                      <span style={{ width: `${(s.seen / qs.length) * 100}%` }} />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
        {untagged.length > 0 && <p className="muted small">주제 미분류 {untagged.length}문항은 영역 전체 학습에 포함됩니다.</p>}
      </div>
      <button className="tile" onClick={onCompare}>
        <b>PMBOK 7판 vs 8판 비교</b>
        <span className="muted">달라진 원칙·성과 영역·시험 포인트</span>
      </button>
    </div>
  )
}
