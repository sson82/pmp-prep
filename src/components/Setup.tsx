import { useState } from 'react'
import { ECO_NOTE } from '../data/editionDiff'
import type { PracticeFilter } from '../lib/session'
import type { Approach, Domain, Edition } from '../types'
import { APPROACH_LABEL, DOMAIN_LABEL, EDITION_LABEL } from '../types'

function Toggles<T extends string>({ label, all, value, names, onChange }: { label: string; all: T[]; value: T[]; names: Record<T, string>; onChange: (v: T[]) => void }) {
  return (
    <fieldset className="field">
      <legend>{label}</legend>
      <div className="toggles">
        {all.map((k) => (
          <button
            key={k}
            className={value.includes(k) ? 'on' : ''}
            aria-pressed={value.includes(k)}
            onClick={() => onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k])}
          >
            {names[k]}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

export function PracticeSetup({ available, onStart }: { available: (f: PracticeFilter) => number; onStart: (f: PracticeFilter) => void }) {
  const [f, setF] = useState<PracticeFilter>({
    domains: ['people', 'process', 'business'],
    editions: ['7th', '8th', 'both'],
    approaches: ['predictive', 'agile', 'hybrid'],
    count: 10,
    onlyUnseen: false,
  })
  const n = available({ ...f, count: Infinity })
  return (
    <div className="card form">
      <h2>맞춤 연습</h2>
      <Toggles<Domain> label="ECO 도메인" all={['people', 'process', 'business']} value={f.domains} names={DOMAIN_LABEL} onChange={(domains) => setF({ ...f, domains })} />
      <Toggles<Edition> label="PMBOK 판" all={['8th', '7th', 'both']} value={f.editions} names={EDITION_LABEL} onChange={(editions) => setF({ ...f, editions })} />
      <Toggles<Approach> label="개발 방식" all={['predictive', 'agile', 'hybrid']} value={f.approaches} names={APPROACH_LABEL} onChange={(approaches) => setF({ ...f, approaches })} />
      <label className="row">
        <input type="checkbox" checked={f.onlyUnseen} onChange={(e) => setF({ ...f, onlyUnseen: e.target.checked })} />
        아직 안 푼 문항만
      </label>
      <label className="row">
        문항 수
        <input type="number" min={1} max={200} value={f.count} onChange={(e) => setF({ ...f, count: Math.max(1, Number(e.target.value)) })} />
        <span className="muted">(조건에 맞는 문항 {n}개)</span>
      </label>
      <button className="btn primary" disabled={n === 0} onClick={() => onStart(f)}>
        {Math.min(n, f.count)}문항 시작
      </button>
    </div>
  )
}

export function MockSetup({ bankSize, onStart }: { bankSize: number; onStart: (count: number, minutes: number) => void }) {
  const presets = [
    { label: '미니 (20문항 · 26분)', count: 20, min: 26 },
    { label: '하프 (60문항 · 77분)', count: 60, min: 77 },
    { label: '실전 (180문항 · 230분)', count: 180, min: 230 },
  ]
  return (
    <div className="card form">
      <h2>모의고사</h2>
      <p className="muted">{ECO_NOTE}</p>
      <p className="muted">시험 중에는 정답이 표시되지 않고, 끝난 뒤 한꺼번에 채점합니다. 문제 은행에 {bankSize}문항이 있으며, 부족하면 있는 만큼만 출제합니다.</p>
      <div className="stack">
        {presets.map((p) => (
          <button key={p.count} className="btn" onClick={() => onStart(p.count, Math.round((p.min * Math.min(p.count, bankSize)) / p.count))}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
