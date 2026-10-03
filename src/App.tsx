import { useMemo, useState } from 'react'
import { Compare } from './components/Compare'
import { Home } from './components/Home'
import { Quiz } from './components/Quiz'
import { MockSetup, PracticeSetup } from './components/Setup'
import { Stats } from './components/Stats'
import { Wrong } from './components/Wrong'
import { QUESTIONS } from './data/questions'
import { buildMock, buildPractice, buildReviewQueue, dueQuestions, wrongQuestions } from './lib/session'
import { useStore } from './lib/useStore'
import type { Question, SessionMode } from './types'

type View = 'home' | 'practice' | 'mock' | 'wrong' | 'compare' | 'stats'

interface Session {
  key: number
  title: string
  questions: Question[]
  mode: SessionMode
  timeLimitSec?: number
}

const NAV: { view: View; label: string; icon: string }[] = [
  { view: 'home', label: '홈', icon: '⌂' },
  { view: 'wrong', label: '오답노트', icon: '✎' },
  { view: 'practice', label: '연습', icon: '◎' },
  { view: 'compare', label: '7 vs 8', icon: '⇄' },
  { view: 'stats', label: '통계', icon: '▤' },
]

export default function App() {
  const { data, sync, backend, resync, commit, record } = useStore()
  const [view, setView] = useState<View>('home')
  const [session, setSession] = useState<Session | null>(null)

  const bank = useMemo(() => [...QUESTIONS, ...data.customQuestions], [data.customQuestions])
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])

  const start = (s: Omit<Session, 'key'>) => {
    setSession({ ...s, key: Date.now() })
    window.scrollTo(0, 0)
  }

  if (session) {
    return (
      <main className="app">
        <Quiz
          {...session}
          key={session.key}
          onRecord={record}
          onExit={() => {
            setSession(null)
            window.scrollTo(0, 0)
          }}
        />
      </main>
    )
  }

  return (
    <div className="shell">
      <header className="topbar">
        <button className="brand" onClick={() => setView('home')}>
          PMP <span>Prep</span>
        </button>
        <nav className="nav-top">
          {NAV.map((n) => (
            <button key={n.view} className={view === n.view ? 'on' : ''} onClick={() => setView(n.view)}>
              {n.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app">
        {view === 'home' && (
          <Home
            data={data}
            bank={bank}
            byId={byId}
            dueCount={dueQuestions(data, bank).length}
            sync={sync}
            onReview={() => start({ title: '오늘의 학습', questions: buildReviewQueue(data, bank), mode: 'review' })}
            go={setView}
          />
        )}
        {view === 'practice' && (
          <PracticeSetup
            available={(f) => buildPractice(data, bank, f).length}
            onStart={(f) => start({ title: '맞춤 연습', questions: buildPractice(data, bank, f), mode: 'practice' })}
          />
        )}
        {view === 'mock' && (
          <MockSetup
            bankSize={bank.length}
            onStart={(count, min) => start({ title: '모의고사', questions: buildMock(bank, count), mode: 'mock', timeLimitSec: min * 60 })}
          />
        )}
        {view === 'wrong' && (
          <Wrong data={data} questions={wrongQuestions(data, bank)} onRetry={(qs) => start({ title: '오답 다시 풀기', questions: qs, mode: 'wrong' })} />
        )}
        {view === 'compare' && (
          <Compare
            onDrill={() =>
              start({
                title: '8판 집중',
                questions: buildPractice(data, bank, {
                  domains: ['people', 'process', 'business'],
                  editions: ['8th'],
                  approaches: ['predictive', 'agile', 'hybrid'],
                  count: 20,
                  onlyUnseen: false,
                }),
                mode: 'practice',
              })
            }
          />
        )}
        {view === 'stats' && <Stats data={data} byId={byId} commit={commit} sync={sync} backend={backend} resync={resync} />}
      </main>

      <nav className="nav-bottom">
        {NAV.map((n) => (
          <button key={n.view} className={view === n.view ? 'on' : ''} onClick={() => setView(n.view)}>
            <span aria-hidden>{n.icon}</span>
            {n.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
