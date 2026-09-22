import { tallyVotes } from '../lib/rooms'
import type { Room } from '../types'
import './ResultsPanel.css'

interface Props {
  room: Room
}

export function ResultsPanel({ room }: Props) {
  const t = tallyVotes(room.voters)
  const cast = Math.max(t.cast, 1)
  const yesDeg = (t.yes / cast) * 360
  const noDeg = (t.no / cast) * 360
  const abstainDeg = (t.abstain / cast) * 360

  const gradient =
    t.cast === 0
      ? 'conic-gradient(#334155 0deg 360deg)'
      : `conic-gradient(
          #22c55e 0deg ${yesDeg}deg,
          #ef4444 ${yesDeg}deg ${yesDeg + noDeg}deg,
          #eab308 ${yesDeg + noDeg}deg ${yesDeg + noDeg + abstainDeg}deg
        )`

  return (
    <div className="results-panel">
      <div className="results-chart" style={{ background: gradient }} aria-hidden>
        <div className="results-chart-hole" />
      </div>
      <div className="results-legend">
        <div className="results-legend-item">
          <span className="swatch swatch--yes" />
          <span>찬성: {t.yesPct.toFixed(2)}%</span>
        </div>
        <div className="results-legend-item">
          <span className="swatch swatch--no" />
          <span>반대: {t.noPct.toFixed(2)}%</span>
        </div>
        <div className="results-legend-item">
          <span className="swatch swatch--abstain" />
          <span>기권: {t.abstainPct.toFixed(2)}%</span>
        </div>
      </div>
    </div>
  )
}
