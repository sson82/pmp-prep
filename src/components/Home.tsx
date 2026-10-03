import type { SyncStatus } from '../lib/cloud'
import { accuracy, streakDays, summarize, todayCount } from '../lib/stats'
import type { Domain, Question, StoreData } from '../types'
import { DOMAIN_LABEL } from '../types'

interface Props {
  data: StoreData
  bank: Question[]
  byId: Map<string, Question>
  dueCount: number
  sync: SyncStatus
  onReview: () => void
  go: (v: 'learn' | 'exam' | 'wrong' | 'compare') => void
}

const SYNC_LABEL: Record<SyncStatus, string> = {
  local: '이 기기에만 저장 · 통계 탭에서 기기 동기화 설정',
  connecting: '동기화 연결 중…',
  synced: '모든 기기 동기화됨',
  saving: '저장 중…',
  error: '동기화 오류 · 이 기기에 저장됨',
}

export function Home({ data, bank, byId, dueCount, sync, onReview, go }: Props) {
  const { all, domain } = summarize(data, byId)
  const seen = Object.keys(data.cards).filter((id) => byId.has(id)).length
  const unseen = bank.length - seen
  const newToday = Math.min(unseen, data.settings.dailyNew)
  const wrongCount = Object.values(data.cards).filter((c) => c.wrongCount > 0 && byId.has(c.qid)).length
  const weakest = (Object.keys(domain) as Domain[])
    .filter((d) => domain[d].total >= 3)
    .sort((a, b) => accuracy(domain[a]) - accuracy(domain[b]))[0]

  return (
    <div className="home">
      <section className="card hero">
        <div>
          <p className="muted">오늘의 학습</p>
          <p className="big">{dueCount + newToday}문항</p>
          <p className="muted">
            복습 {dueCount} · 신규 {newToday}
            {weakest && <> · 취약 영역 <b>{DOMAIN_LABEL[weakest].split(' ')[0]}</b> 중심으로 출제</>}
          </p>
        </div>
        <button className="btn primary lg" onClick={onReview} disabled={dueCount + newToday === 0}>
          {dueCount + newToday === 0 ? '오늘 분량 완료 🎉' : '시작하기'}
        </button>
      </section>

      <section className="kpis">
        <div className="kpi">
          <span className="muted">정답률</span>
          <b>{all.total ? `${Math.round(accuracy(all) * 100)}%` : '–'}</b>
        </div>
        <div className="kpi">
          <span className="muted">오늘 푼 문항</span>
          <b>{todayCount(data.attempts)}</b>
        </div>
        <div className="kpi">
          <span className="muted">연속 학습</span>
          <b>{streakDays(data.attempts)}일</b>
        </div>
        <div className="kpi">
          <span className="muted">진도</span>
          <b>
            {seen}/{bank.length}
          </b>
        </div>
      </section>

      <section className="tiles">
        <button className="tile" onClick={() => go('learn')}>
          <b>문제 학습</b>
          <span className="muted">영역 → 주제별 체계 학습</span>
        </button>
        <button className="tile" onClick={() => go('exam')}>
          <b>실전 문제</b>
          <span className="muted">영역·문항 수 선택 · 시간 제한</span>
        </button>
        <button className="tile" onClick={() => go('wrong')}>
          <b>오답 관리</b>
          <span className="muted">{wrongCount}문항 누적</span>
        </button>
        <button className="tile" onClick={() => go('compare')}>
          <b>7판 vs 8판</b>
          <span className="muted">핵심 차이 비교표</span>
        </button>
      </section>

      <p className={`sync sync-${sync}`}>● {SYNC_LABEL[sync]}</p>
    </div>
  )
}
