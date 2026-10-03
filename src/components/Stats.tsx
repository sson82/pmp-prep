import { useRef, useState } from 'react'
import type { SyncStatus } from '../lib/cloud'
import { accuracy, avgSec, summarize, type Bucket } from '../lib/stats'
import { TARGET_MS } from '../lib/srs'
import { download, emptyStore, parseBackup, parseQuestions } from '../lib/storage'
import type { Domain, Edition, Question, StoreData } from '../types'
import { DOMAIN_LABEL, EDITION_LABEL } from '../types'
import { SyncPanel } from './SyncPanel'

function Meter({ label, b }: { label: string; b: Bucket }) {
  const pct = Math.round(accuracy(b) * 100)
  const level = !b.total ? '' : pct >= 75 ? 'good' : pct >= 60 ? 'mid' : 'bad'
  return (
    <div className="meter">
      <div className="meter-label">
        <span>{label}</span>
        <span className="mono">
          {b.total ? `${pct}%` : '–'} <span className="muted">· {b.total}문항 · {b.total ? `${avgSec(b).toFixed(0)}초` : '–'}</span>
        </span>
      </div>
      <div className="meter-track">
        <div className={`meter-fill ${level}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

interface Props {
  data: StoreData
  byId: Map<string, Question>
  commit: (fn: (d: StoreData) => StoreData) => void
  sync: SyncStatus
  backend: 'claude' | 'gist' | null
  resync: () => void
}

export function Stats({ data, byId, commit, sync, backend, resync }: Props) {
  const { all, domain, edition, weakTags } = summarize(data, byId)
  const [msg, setMsg] = useState('')
  const backupInput = useRef<HTMLInputElement>(null)
  const qInput = useRef<HTMLInputElement>(null)

  const readFile = (input: HTMLInputElement | null, fn: (text: string) => void) => {
    const file = input?.files?.[0]
    if (!file) return
    void file.text().then((t) => {
      try {
        fn(t)
      } catch (e) {
        setMsg(`⚠ ${(e as Error).message}`)
      }
      input!.value = ''
    })
  }

  return (
    <div className="stats">
      <section className="card">
        <h2>도메인별 정답률</h2>
        <p className="muted">최근 300회 풀이 기준 · 권장 풀이 시간 {TARGET_MS / 1000}초/문항</p>
        <Meter label="전체" b={all} />
        {(Object.keys(domain) as Domain[]).map((d) => (
          <Meter key={d} label={DOMAIN_LABEL[d]} b={domain[d]} />
        ))}
      </section>

      <section className="card">
        <h2>판별 정답률</h2>
        {(['8th', '7th', 'both'] as Edition[]).map((e) => (
          <Meter key={e} label={`${EDITION_LABEL[e]} 문항`} b={edition[e]} />
        ))}
      </section>

      <section className="card">
        <h2>취약 주제</h2>
        {weakTags.length === 0 ? (
          <p className="muted">주제별로 2문항 이상 풀면 표시됩니다.</p>
        ) : (
          weakTags.map(([t, b]) => <Meter key={t} label={`#${t}`} b={b} />)
        )}
      </section>

      <SyncPanel backend={backend} sync={sync} onChange={resync} />

      <section className="card form">
        <h2>설정 · 데이터</h2>
        <label className="row">
          하루 신규 문항 수
          <input
            type="number"
            min={0}
            max={100}
            value={data.settings.dailyNew}
            onChange={(e) => commit((d) => ({ ...d, settings: { ...d.settings, dailyNew: Math.max(0, Number(e.target.value)) } }))}
          />
        </label>

        <div className="stack">
          <button className="btn" onClick={() => download(`pmp-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data))}>
            학습 기록 백업 (JSON)
          </button>
          <button className="btn" onClick={() => backupInput.current?.click()}>
            백업 복원
          </button>
          <input
            ref={backupInput}
            type="file"
            accept="application/json"
            hidden
            onChange={() =>
              readFile(backupInput.current, (t) => {
                const restored = parseBackup(t)
                commit(() => restored)
                setMsg('백업을 복원했습니다.')
              })
            }
          />
          <button className="btn" onClick={() => qInput.current?.click()}>
            문제 세트 가져오기 (JSON)
          </button>
          <input
            ref={qInput}
            type="file"
            accept="application/json"
            hidden
            onChange={() =>
              readFile(qInput.current, (t) => {
                const qs = parseQuestions(t)
                commit((d) => {
                  const ids = new Set(qs.map((q) => q.id))
                  return { ...d, customQuestions: [...d.customQuestions.filter((q) => !ids.has(q.id)), ...qs] }
                })
                setMsg(`${qs.length}문항을 추가했습니다.`)
              })
            }
          />
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('모든 학습 기록과 가져온 문항을 삭제할까요? 되돌릴 수 없습니다.')) commit(() => emptyStore())
            }}
          >
            학습 기록 초기화
          </button>
        </div>
        {msg && <p className="muted">{msg}</p>}
        <details>
          <summary>문제 세트 JSON 형식</summary>
          <pre>{`[
  {
    "id": "my-001",
    "domain": "people | process | business",
    "edition": "7th | 8th | both",
    "approach": "predictive | agile | hybrid",
    "tags": ["갈등관리"],
    "stem": "문제 지문",
    "options": ["보기1", "보기2", "보기3", "보기4"],
    "answer": [1],
    "explanation": "해설",
    "optionNotes": ["보기별 해설(선택)"],
    "diffNote": "7판 vs 8판 포인트(선택)"
  }
]`}</pre>
        </details>
        <p className="muted">가져온 문항 {data.customQuestions.length}개 · 풀이 기록 {data.attempts.length}건</p>
      </section>
    </div>
  )
}
