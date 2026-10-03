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
      <p className="muted">8판의 세부 명칭은 PMI 공식 원문으로 최종 확인하세요.</p>
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
