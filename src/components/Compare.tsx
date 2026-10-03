import { EDITION_DIFF } from '../data/editionDiff'

export function Compare({ onDrill }: { onDrill: () => void }) {
  return (
    <div className="card">
      <div className="row between">
        <h2>PMBOK 7판 vs 8판</h2>
        <button className="btn primary" onClick={onDrill}>
          8판 문항 풀기
        </button>
      </div>
      <p className="muted">8판: 2025년 11월 발행 · 6원칙 · 7성과 영역 · 5중점 영역 · 40프로세스</p>
      <div className="diff-grid">
        {EDITION_DIFF.map((r) => (
          <section key={r.topic} className="diff-row">
            <h3>{r.topic}</h3>
            <div className="cols">
              <div>
                <span className="chip ed-7th">7판</span>
                <p>{r.v7}</p>
              </div>
              <div>
                <span className="chip ed-8th">8판</span>
                <p>{r.v8}</p>
              </div>
            </div>
            <p className="exam">
              <b>시험 포인트</b> {r.exam}
            </p>
          </section>
        ))}
      </div>
    </div>
  )
}
