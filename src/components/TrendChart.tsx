import { useState } from 'react'

export interface Series {
  key: string
  label: string
  /** CSS 변수 이름 (예: --s1) */
  color: string
  values: (number | null)[]
}

interface Props {
  labels: string[]
  series: Series[]
  /** 표 보기에서 값 뒤에 붙일 단위 */
  unit?: string
}

const W = 640
const H = 220
const PAD = { l: 34, r: 64, t: 12, b: 26 }

/** 정답률 추이 선 그래프: 0~100 고정 축, 십자선 툴팁, 범례, 끝점 직접 라벨, 표 보기 */
export function TrendChart({ labels, series, unit = '%' }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const n = labels.length
  const x = (i: number) => PAD.l + (n <= 1 ? (W - PAD.l - PAD.r) / 2 : (i * (W - PAD.l - PAD.r)) / (n - 1))
  const y = (v: number) => PAD.t + ((100 - v) * (H - PAD.t - PAD.b)) / 100

  const path = (vals: (number | null)[]) => {
    let d = ''
    let pen = false
    vals.forEach((v, i) => {
      if (v === null) {
        pen = false
        return
      }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`
      pen = true
    })
    return d
  }
  const lastIdx = (vals: (number | null)[]) => vals.reduce<number>((acc, v, i) => (v === null ? acc : i), -1)

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0
    for (let i = 1; i < n; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i
    setHover(best)
  }

  // 끝점 라벨이 겹치지 않게 세로로 밀어낸다
  const ends = series
    .map((s) => ({ s, i: lastIdx(s.values) }))
    .filter((e) => e.i >= 0)
    .map((e) => ({ ...e, ly: y(e.s.values[e.i]!) }))
    .sort((a, b) => a.ly - b.ly)
  for (let k = 1; k < ends.length; k++) if (ends[k].ly - ends[k - 1].ly < 13) ends[k].ly = ends[k - 1].ly + 13

  return (
    <figure className="viz">
      <ul className="legend">
        {series.map((s) => (
          <li key={s.key}>
            <span className="swatch" style={{ background: `var(${s.color})` }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="viz-plot">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="날짜별 정답률 추이" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
          {[0, 25, 50, 75, 100].map((g) => (
            <g key={g}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(g)} y2={y(g)} className="grid" />
              <text x={PAD.l - 6} y={y(g) + 4} className="axis" textAnchor="end">
                {g}
              </text>
            </g>
          ))}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(70)} y2={y(70)} className="target" />
          {labels.map((l, i) =>
            n <= 8 || i % Math.ceil(n / 8) === 0 || i === n - 1 ? (
              <text key={i} x={x(i)} y={H - 8} className="axis" textAnchor="middle">
                {l}
              </text>
            ) : null,
          )}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={H - PAD.b} className="crosshair" />}
          {series.map((s) => (
            <g key={s.key}>
              <path d={path(s.values)} fill="none" stroke={`var(${s.color})`} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {s.values.map((v, i) =>
                v === null || (n > 12 && i !== hover) ? null : <circle key={i} cx={x(i)} cy={y(v)} r={i === hover ? 5 : 3.5} fill={`var(${s.color})`} className="dot" />,
              )}
            </g>
          ))}
          {ends.map(({ s, ly }) => (
            <text key={s.key} x={W - PAD.r + 8} y={ly + 4} className="end-label">
              {s.label} {s.values[lastIdx(s.values)]}
            </text>
          ))}
        </svg>
        {hover !== null && (
          <div className="tooltip" style={{ left: `${(x(hover) / W) * 100}%` }}>
            <b>{labels[hover]}</b>
            {series.map((s) => (
              <span key={s.key}>
                <span className="swatch" style={{ background: `var(${s.color})` }} />
                {s.label} {s.values[hover] === null ? '–' : `${s.values[hover]}${unit}`}
              </span>
            ))}
          </div>
        )}
      </div>
      <details className="table-view">
        <summary>표로 보기</summary>
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              {series.map((s) => (
                <th key={s.key}>{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((l, i) => (
              <tr key={l}>
                <td>{l}</td>
                {series.map((s) => (
                  <td key={s.key}>{s.values[i] === null ? '–' : `${s.values[i]}${unit}`}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
