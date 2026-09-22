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
        <span className="stats-label">Total</span>
        <span className="stats-value">{t.total}</span>
      </div>
      <div className="stats-cell">
        <span className="stats-label">Present</span>
        <span className="stats-value">{showPresent ? t.present : '—'}</span>
      </div>
      <div className="stats-cell stats-cell--yes">
        <span className="stats-label">Yes</span>
        <span className="stats-value">{showPresent ? t.yes : '—'}</span>
      </div>
      <div className="stats-cell stats-cell--no">
        <span className="stats-label">No</span>
        <span className="stats-value">{showPresent ? t.no : '—'}</span>
      </div>
      <div className="stats-cell stats-cell--abstain">
        <span className="stats-label">Abstain</span>
        <span className="stats-value">{showPresent ? t.abstain : '—'}</span>
      </div>
    </div>
  )
}
