import { useState } from 'react'
import type { Question, StoreData } from '../types'
import { DOMAIN_LABEL, EDITION_LABEL } from '../types'

export function Wrong({ data, questions, onRetry }: { data: StoreData; questions: Question[]; onRetry: (qs: Question[]) => void }) {
  const [open, setOpen] = useState<string | null>(null)
  if (questions.length === 0) {
    return (
      <div className="card empty">
        <h2>오답노트</h2>
        <p className="muted">아직 틀린 문항이 없습니다. 틀린 문항은 여기에 자동으로 쌓입니다.</p>
      </div>
    )
  }
  const lastWrong = (id: string) => [...data.attempts].reverse().find((a) => a.qid === id && !a.correct)
  return (
    <div className="card">
      <div className="row between">
        <h2>오답노트 ({questions.length})</h2>
        <button className="btn primary" onClick={() => onRetry(questions)}>
          전체 다시 풀기
        </button>
      </div>
      <p className="muted">많이 틀린 순서로 정렬됩니다. 다시 풀어 맞혀도 기록은 남고, 복습 간격만 늘어납니다.</p>
      <ul className="review-list">
        {questions.map((q) => {
          const c = data.cards[q.id]
          const lw = lastWrong(q.id)
          return (
            <li key={q.id}>
              <button className="link left" onClick={() => setOpen(open === q.id ? null : q.id)}>
                <span className="badge">{c.wrongCount}회</span> {q.stem}
              </button>
              {open === q.id && (
                <div className="review-body">
                  <p className="muted">
                    {DOMAIN_LABEL[q.domain]} · {EDITION_LABEL[q.edition]} · {q.tags.join(', ')}
                  </p>
                  {lw && (
                    <p>
                      최근 오답: <span className="wrong-text">{lw.selected.map((i) => q.options[i]).join(', ')}</span>
                    </p>
                  )}
                  <p>
                    정답: <span className="ok-text">{q.answer.map((i) => q.options[i]).join(', ')}</span>
                  </p>
                  <p>{q.explanation}</p>
                  {q.diffNote && <p className="diff">{q.diffNote}</p>}
                  <button className="btn" onClick={() => onRetry([q])}>
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
