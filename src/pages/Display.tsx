import { Link, useParams } from 'react-router-dom'
import { BoardShell } from '../components/BoardShell'
import { SetupGate } from '../components/SetupGate'
import { useRoom } from '../hooks/useRoom'
import { isFirebaseConfigured } from '../lib/firebase'
import './Display.css'

export function Display() {
  const { seed = '' } = useParams()
  const { room, loading, error } = useRoom(seed)

  if (!isFirebaseConfigured()) return <SetupGate />

  if (loading) {
    return <div className="display-status">전광판 연결 중…</div>
  }

  if (error || !room) {
    return (
      <div className="display-status">
        <p>{error ?? '방을 찾을 수 없습니다.'}</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  return (
    <div className="display-page">
      <BoardShell room={room} seed={seed} showSeed />
    </div>
  )
}
