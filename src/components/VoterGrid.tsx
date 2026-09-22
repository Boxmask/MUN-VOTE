import type { Room, VoteChoice } from '../types'
import { VOTE_COLOR } from '../types'
import './VoterGrid.css'

interface Props {
  room: Room
  highlightId?: string | null
  revealVotes?: boolean
}

function sortIds(voters: Room['voters']): string[] {
  return Object.keys(voters ?? {}).sort((a, b) =>
    a.localeCompare(b, 'ko', { sensitivity: 'base' }),
  )
}

export function VoterGrid({ room, highlightId, revealVotes = true }: Props) {
  const ids = sortIds(room.voters)
  const showDots = revealVotes && room.status !== 'lobby'

  if (ids.length === 0) {
    return (
      <div className="voter-grid voter-grid--empty">
        <p>아직 입장한 대표가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="voter-grid" role="list">
      {ids.map((id) => {
        const vote = room.voters[id]?.vote as VoteChoice | null
        const active = showDots && vote !== null
        const color = vote ? VOTE_COLOR[vote] : undefined

        return (
          <div
            key={id}
            role="listitem"
            className={`voter-item ${active ? 'voter-item--voted' : 'voter-item--idle'} ${
              highlightId === id ? 'voter-item--me' : ''
            }`}
          >
            <span
              className={`voter-dot ${active ? 'voter-dot--on' : ''}`}
              style={active && color ? { background: color, boxShadow: `0 0 10px ${color}` } : undefined}
              aria-hidden
            />
            <span className="voter-name">{id}</span>
          </div>
        )
      })}
    </div>
  )
}
