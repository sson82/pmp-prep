import type { FreqLevel } from '../lib/frequency'
import type { Question } from '../types'

/** 해설 아래에 붙는 학습 포인트: 문제 의도 · 출제 빈도 · 관점 · 팁 · 판 차이 · 정답 근거 */
export function Insight({ q, freq }: { q: Question; freq?: { count: number; level: FreqLevel } }) {
  return (
    <div className="insight">
      {q.intent && (
        <p>
          <b>문제 의도</b> {q.intent}
        </p>
      )}
      {freq && (
        <p>
          <b>출제 빈도</b> <span className={`freq freq-${freq.level}`}>{freq.level}</span> {q.topic} · 문제은행 {freq.count}문항
        </p>
      )}
      {q.perspective && (
        <p>
          <b>바라보는 관점</b> {q.perspective}
        </p>
      )}
      {q.tip && (
        <p>
          <b>풀이 팁</b> {q.tip}
        </p>
      )}
      {q.diffNote && (
        <p className="diff">
          <b>7판 vs 8판</b> {q.diffNote}
        </p>
      )}
      {q.answerBasis === 'ai' && <p className="muted small">정답은 원본에 없어 AI가 두 번 독립적으로 풀어 일치한 답입니다. 강의 해설과 다르면 알려 주세요.</p>}
      {q.answerBasis === 'review' && <p className="warn small">⚠ 정답 검토 필요: AI 풀이가 엇갈린 문항입니다.</p>}
      {q.source && <p className="muted small">출처: {q.source}</p>}
    </div>
  )
}
