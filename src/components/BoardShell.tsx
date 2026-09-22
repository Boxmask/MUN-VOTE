import type { ReactNode } from 'react'
import type { Room } from '../types'
import { ResultsPanel } from './ResultsPanel'
import { StatsBar } from './StatsBar'
import { VoterGrid } from './VoterGrid'
import './BoardShell.css'

interface Props {
  room: Room
  seed: string
  highlightId?: string | null
  showSeed?: boolean
  footer?: ReactNode
}

export function BoardShell({ room, seed, highlightId, showSeed, footer }: Props) {
  const title =
    room.status === 'lobby'
      ? '투표 대기 중'
      : room.topic || '투표 진행 중'

  return (
    <div className="board-shell">
      <header className="board-header">
        <div className="board-header-top">
          <h1 className="board-topic">{title}</h1>
          {showSeed && (
            <div className="board-seed" title="Seed number">
              <span>SEED</span>
              <strong>{seed}</strong>
            </div>
          )}
        </div>
        <StatsBar room={room} />
        <div className="board-status-line">
          {room.status === 'lobby' && <span>호스트가 Topic을 입력하면 투표가 시작됩니다</span>}
          {room.status === 'voting' && <span className="pulse">투표 진행 중</span>}
          {room.status === 'results' && <span>투표 결과</span>}
        </div>
      </header>

      <main className="board-main">
        {room.status === 'results' ? (
          <div className="board-results-layout">
            <ResultsPanel room={room} />
            <VoterGrid room={room} highlightId={highlightId} />
          </div>
        ) : (
          <VoterGrid room={room} highlightId={highlightId} />
        )}
      </main>

      {footer && <footer className="board-footer">{footer}</footer>}
    </div>
  )
}
