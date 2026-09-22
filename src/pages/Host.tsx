import { type FormEvent, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BoardShell } from '../components/BoardShell'
import { SetupGate } from '../components/SetupGate'
import { useRoom } from '../hooks/useRoom'
import { isFirebaseConfigured } from '../lib/firebase'
import {
  endVote,
  hostKeyStorageKey,
  removeVoter,
  resetToLobby,
  startVote,
  tallyVotes,
} from '../lib/rooms'
import { VOTE_LABEL } from '../types'
import './Host.css'

export function Host() {
  const { seed = '' } = useParams()
  const { room, loading, error } = useRoom(seed)
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const hostKey = useMemo(
    () => (typeof window !== 'undefined' ? localStorage.getItem(hostKeyStorageKey(seed)) : null),
    [seed],
  )

  if (!isFirebaseConfigured()) return <SetupGate />

  if (loading) {
    return <div className="page-status">Loading table…</div>
  }

  if (error || !room) {
    return (
      <div className="page-status page-status--error">
        <p>{error ?? 'Room not found.'}</p>
        <Link to="/">Home</Link>
      </div>
    )
  }

  if (!hostKey || hostKey !== room.hostKey) {
    return (
      <div className="page-status page-status--error">
        <p>This browser is not the host. Open the table from the device that created it.</p>
        <p className="muted">
          Display only: <Link to={`/display/${seed}`}>Open board</Link>
        </p>
        <Link to="/">Home</Link>
      </div>
    )
  }

  const t = tallyVotes(room.voters)
  const displayUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/display/${seed}` : `/display/${seed}`

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage(null)
    try {
      await action()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  function onStart(e: FormEvent) {
    e.preventDefault()
    void run(() => startVote(seed, hostKey!, topic))
  }

  function openDisplay() {
    window.open(`/display/${seed}`, 'mun-display', 'noopener,noreferrer')
  }

  async function copyDisplayLink() {
    try {
      await navigator.clipboard.writeText(displayUrl)
      setMessage('Display link copied.')
    } catch {
      setMessage(displayUrl)
    }
  }

  const voterIds = Object.keys(room.voters ?? {}).sort((a, b) =>
    a.localeCompare(b, 'en', { sensitivity: 'base' }),
  )

  return (
    <div className="host-layout">
      <aside className="host-panel">
        <div className="host-panel-brand">
          <Link to="/">MUN Voting</Link>
          <span>Host</span>
        </div>

        <div className="host-seed-block">
          <p className="label">Seed number</p>
          <p className="host-seed">{seed}</p>
          <p className="hint">Share this number with delegates.</p>
        </div>

        <div className="host-share-card">
          <h2>Display board (for screen share)</h2>
          <p>
            In Zoom / FaceTime / AirPlay, share <strong>the display window only</strong> — not this
            control panel.
          </p>
          <div className="host-share-actions">
            <button type="button" className="btn btn--primary" onClick={openDisplay}>
              Open Display Board
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void copyDisplayLink()}>
              Copy link
            </button>
          </div>
          <Link className="host-guide-link" to="/guide">
            How to share one window on Mac
          </Link>
        </div>

        {room.status === 'lobby' && (
          <form className="host-form" onSubmit={onStart}>
            <label htmlFor="topic">Topic</label>
            <textarea
              id="topic"
              rows={3}
              placeholder="e.g. Draft Resolution A"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !topic.trim()}>
              Start Vote
            </button>
          </form>
        )}

        {room.status === 'voting' && (
          <div className="host-form">
            <p className="live-topic">{room.topic}</p>
            <p className="hint">
              Ballots {t.cast}/{t.total}
              {t.pending > 0 ? ` · pending ${t.pending}` : ''}
            </p>
            <button
              type="button"
              className="btn btn--danger"
              disabled={busy}
              onClick={() => void run(() => endVote(seed, hostKey))}
            >
              END VOTE
            </button>
          </div>
        )}

        {room.status === 'results' && (
          <div className="host-form">
            <p className="live-topic">{room.topic}</p>
            <p className="hint">Showing results. Continue when ready for the next topic.</p>
            <button
              type="button"
              className="btn btn--primary"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await resetToLobby(seed, hostKey)
                  setTopic('')
                })
              }
            >
              New Topic
            </button>
          </div>
        )}

        {message && <p className="host-message">{message}</p>}

        <div className="host-roster">
          <div className="host-roster-head">
            <h2>Roster</h2>
            <span>{voterIds.length}</span>
          </div>
          <ul>
            {voterIds.length === 0 && <li className="empty">No delegates yet.</li>}
            {voterIds.map((id) => {
              const vote = room.voters[id]?.vote
              return (
                <li key={id}>
                  <span className="roster-id">{id}</span>
                  <span className={`roster-vote roster-vote--${vote ?? 'none'}`}>
                    {vote ? VOTE_LABEL[vote] : '—'}
                  </span>
                  {room.status === 'lobby' && (
                    <button
                      type="button"
                      className="roster-remove"
                      disabled={busy}
                      onClick={() => void run(() => removeVoter(seed, hostKey, id))}
                    >
                      Remove
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <section className="host-preview" aria-label="Preview">
        <div className="host-preview-label">Preview (not for sharing)</div>
        <BoardShell room={room} seed={seed} showSeed />
      </section>
    </div>
  )
}
