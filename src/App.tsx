import { useEffect, useMemo, useState } from 'react'
import { Compare } from './components/Compare'
import { Home } from './components/Home'
import { Login } from './components/Login'
import { Quiz } from './components/Quiz'
import { Exam } from './components/Exam'
import { Learn } from './components/Learn'
import { Stats } from './components/Stats'
import { Wrong } from './components/Wrong'
import { QUESTIONS } from './data/questions'
import { topicFrequency } from './lib/frequency'
import { buildReviewQueue, dueQuestions, shuffle, wrongQuestions } from './lib/session'
import { detectServer, fetchServerQuestions, uploadQuestions, type ServerMode } from './lib/server'
import { useStore } from './lib/useStore'
import type { Question, SessionMode } from './types'

type View = 'home' | 'learn' | 'exam' | 'wrong' | 'compare' | 'stats'

interface Session {
  key: number
  title: string
  questions: Question[]
  mode: SessionMode
  timeLimitSec?: number
}

const NAV: { view: View; label: string; icon: string }[] = [
  { view: 'home', label: '홈', icon: '⌂' },
  { view: 'learn', label: '문제학습', icon: '◎' },
  { view: 'exam', label: '실전문제', icon: '⏱' },
  { view: 'wrong', label: '오답관리', icon: '✎' },
  { view: 'stats', label: '학습현황', icon: '▤' },
]

export default function App() {
  const [mode, setMode] = useState<ServerMode | null>(null)
  useEffect(() => {
    void detectServer().then(setMode)
  }, [])
  if (mode === null) return null
  if (mode === 'login') return <Login onDone={() => setMode('ready')} />
  return <Main mode={mode} />
}

function Main({ mode }: { mode: ServerMode }) {
  const { data, sync, backend, resync, commit, record } = useStore(mode)
  // 서버 모드에서는 DB의 비공개 문항(학원 자료)을 함께 사용
  const [serverQuestions, setServerQuestions] = useState<Question[]>([])
  useEffect(() => {
    if (mode === 'ready') void fetchServerQuestions().then(setServerQuestions)
  }, [mode])
  const [view, setView] = useState<View>('home')
  const [session, setSession] = useState<Session | null>(null)

  const bank = useMemo(() => [...QUESTIONS, ...serverQuestions, ...data.customQuestions], [serverQuestions, data.customQuestions])
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank])
  const freq = useMemo(() => topicFrequency(bank), [bank])

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
          sid={session.key}
          freq={freq}
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
        {view === 'learn' && (
          <Learn
            data={data}
            bank={bank}
            freq={freq}
            onStudy={(title, qs) => start({ title, questions: shuffle(qs), mode: 'practice' })}
            onCompare={() => setView('compare')}
          />
        )}
        {view === 'exam' && <Exam data={data} bank={bank} onStart={(title, qs, timeLimitSec) => start({ title, questions: qs, mode: 'mock', timeLimitSec })} />}
        {view === 'wrong' && <Wrong data={data} questions={wrongQuestions(data, bank)} freq={freq} onRetry={(title, qs) => start({ title, questions: qs, mode: 'wrong' })} />}
        {view === 'compare' && (
          <Compare onDrill={() => start({ title: '8판 집중', questions: shuffle(bank.filter((q) => q.edition === '8th')).slice(0, 20), mode: 'practice' })} />
        )}
        {view === 'stats' && <Stats
            data={data}
            byId={byId}
            commit={commit}
            sync={sync}
            backend={backend}
            resync={resync}
            onServerImport={
              mode === 'ready'
                ? async (qs) => {
                    const n = await uploadQuestions(qs)
                    setServerQuestions(await fetchServerQuestions())
                    return n
                  }
                : undefined
            }
          />}
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
