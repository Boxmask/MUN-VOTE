import { tallyVotes } from '../lib/rooms'
import type { Room } from '../types'
import './StatsBar.css'

interface Props {
  room: Room
  compact?: boolean
}

export function StatsBar({ room, compact }: Props) {
  const t = tallyVotes(room.voters)
  const showPresent = room.status !== 'lobby'

  return (
    <div className={`stats-bar ${compact ? 'stats-bar--compact' : ''}`}>
      <div className="stats-cell">
        <span className="stats-label">재적</span>
        <span className="stats-value">{t.total}인</span>
      </div>
      <div className="stats-cell">
        <span className="stats-label">재석</span>
        <span className="stats-value">{showPresent ? `${t.present}인` : '—'}</span>
      </div>
      <div className="stats-cell stats-cell--yes">
        <span className="stats-label">찬성</span>
        <span className="stats-value">{showPresent ? `${t.yes}인` : '—'}</span>
      </div>
      <div className="stats-cell stats-cell--no">
        <span className="stats-label">반대</span>
        <span className="stats-value">{showPresent ? `${t.no}인` : '—'}</span>
      </div>
      <div className="stats-cell stats-cell--abstain">
        <span className="stats-label">기권</span>
        <span className="stats-value">{showPresent ? `${t.abstain}인` : '—'}</span>
      </div>
    </div>
  )
}
