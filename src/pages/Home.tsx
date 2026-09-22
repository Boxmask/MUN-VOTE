import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { createRoom } from '../lib/rooms'
import { isFirebaseConfigured } from '../lib/firebase'
import { SetupGate } from '../components/SetupGate'
import './Home.css'

export function Home() {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinSeed, setJoinSeed] = useState('')

  if (!isFirebaseConfigured()) return <SetupGate />

  async function onCreate() {
    setBusy(true)
    setError(null)
    try {
      const { seed } = await createRoom()
      navigate(`/host/${seed}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open table')
    } finally {
      setBusy(false)
    }
  }

  function onJoin(e: FormEvent) {
    e.preventDefault()
    const seed = joinSeed.replace(/\D/g, '').slice(0, 6)
    if (seed.length !== 6) {
      setError('Enter a 6-digit seed number.')
      return
    }
    navigate(`/join/${seed}`)
  }

  return (
    <div className="home">
      <main className="home-main">
        <p className="home-brand">MUN Voting</p>
        <h1 className="home-headline">Committee electronic voting</h1>
        <p className="home-sub">
          The host opens a voting table and gets a seed. Delegates join with that seed and cast
          Yes, No, or Abstain once.
        </p>

        <div className="home-actions">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={onCreate}>
            {busy ? 'Opening…' : 'Open Voting Table'}
          </button>

          <form className="home-join" onSubmit={onJoin}>
            <label className="sr-only" htmlFor="seed">
              Seed number
            </label>
            <input
              id="seed"
              inputMode="numeric"
              autoComplete="off"
              placeholder="Seed number"
              value={joinSeed}
              onChange={(e) => setJoinSeed(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
            />
            <button type="submit" className="btn btn--ghost">
              Join Table
            </button>
          </form>
        </div>

        {error && <p className="home-error">{error}</p>}

        <div className="home-tips">
          <h2>Screen sharing (Mac / Zoom / AirPlay)</h2>
          <p>
            Host controls and the shared board are separate. After opening a table, use{' '}
            <strong>Open Display Board</strong> and share <em>only that window</em>.
          </p>
          <Link to="/guide">How to share the board only</Link>
        </div>
      </main>
    </div>
  )
}
