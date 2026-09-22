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
    return <div className="display-status">Connecting board…</div>
  }

  if (error || !room) {
    return (
      <div className="display-status">
        <p>{error ?? 'Room not found.'}</p>
        <Link to="/">Home</Link>
      </div>
    )
  }

  return (
    <div className="display-page">
      <BoardShell room={room} seed={seed} showSeed />
    </div>
  )
}
