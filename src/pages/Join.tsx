import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BoardShell } from '../components/BoardShell'
import { CountrySuggest } from '../components/CountrySuggest'
import { SetupGate } from '../components/SetupGate'
import { useRoom } from '../hooks/useRoom'
import { isFirebaseConfigured } from '../lib/firebase'
import { castVote, joinRoom, voterIdStorageKey } from '../lib/rooms'
import type { VoteChoice } from '../types'
import { MAX_VOTER_ID_LENGTH, VOTE_LABEL } from '../types'
import './Join.css'

export function Join() {
  const { seed = '' } = useParams()
  const { room, loading, error } = useRoom(seed)
  const [idInput, setIdInput] = useState('')
  const [myId, setMyId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem(voterIdStorageKey(seed))
    setMyId(saved)
    if (saved) setIdInput(saved)
    setMessage(null)
  }, [seed])

  const enrolled = useMemo(() => {
    if (!room || !myId) return false
    return Boolean(room.voters?.[myId])
  }, [room, myId])

  useEffect(() => {
    if (!room || !myId) return
    if (!room.voters?.[myId]) {
      localStorage.removeItem(voterIdStorageKey(seed))
      setMyId(null)
    }
  }, [room, myId, seed])

  if (!isFirebaseConfigured()) return <SetupGate />

  if (loading) {
    return <div className="join-status">Finding table…</div>
  }

  if (error || !room) {
    return (
      <div className="join-status">
        <p>{error ?? 'Room not found.'}</p>
        <Link to="/">Home</Link>
      </div>
    )
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      await joinRoom(seed, idInput)
      setMyId(idInput.trim())
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not join')
    } finally {
      setBusy(false)
    }
  }

  async function onVote(choice: VoteChoice) {
    if (!myId) return
    setBusy(true)
    setMessage(null)
    try {
      await castVote(seed, myId, choice)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Vote failed')
    } finally {
      setBusy(false)
    }
  }

  const myVote = myId && enrolled ? room.voters[myId]?.vote : null

  const voteFooter =
    enrolled && room.status === 'voting' ? (
      <div className="vote-bar">
        <div className="vote-bar-copy">
          <strong>{myId}</strong>
          {myVote ? (
            <span>
              Voted · <em data-vote={myVote}>{VOTE_LABEL[myVote]}</em> (locked)
            </span>
          ) : (
            <span>Choose one. You cannot change your vote after submitting.</span>
          )}
        </div>
        {!myVote && (
          <div className="vote-buttons">
            <button
              type="button"
              className="vote-btn vote-btn--yes"
              disabled={busy}
              onClick={() => void onVote('yes')}
            >
              Yes
            </button>
            <button
              type="button"
              className="vote-btn vote-btn--no"
              disabled={busy}
              onClick={() => void onVote('no')}
            >
              No
            </button>
            <button
              type="button"
              className="vote-btn vote-btn--abstain"
              disabled={busy}
              onClick={() => void onVote('abstain')}
            >
              Abstain
            </button>
          </div>
        )}
        {message && <p className="join-message">{message}</p>}
      </div>
    ) : enrolled ? (
      <div className="vote-bar vote-bar--idle">
        <strong>{myId}</strong>
        <span>
          {room.status === 'lobby' && 'Waiting for the host to start the vote.'}
          {room.status === 'results' && 'Results are in. Wait for the next topic.'}
        </span>
        {message && <p className="join-message">{message}</p>}
      </div>
    ) : null

  if (!enrolled) {
    return (
      <div className="join-gate">
        <div className="join-card">
          <p className="join-seed-label">Seed {seed}</p>
          <h1>Join as delegate</h1>
          <p className="join-lead">
            Type a country name — suggestions appear as you type. Pick one, or enter a custom ID.
            Duplicates are not allowed.
          </p>
          <form onSubmit={onJoin}>
            <label htmlFor="voter-id">Country / ID</label>
            <CountrySuggest
              id="voter-id"
              value={idInput}
              onChange={setIdInput}
              maxLength={MAX_VOTER_ID_LENGTH}
              placeholder="e.g. Korea"
              autoFocus
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !idInput.trim()}>
              {busy ? 'Joining…' : 'Enter'}
            </button>
          </form>
          {message && <p className="join-message">{message}</p>}
          <Link to="/">Different seed</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="join-board">
      <BoardShell room={room} seed={seed} highlightId={myId} showSeed footer={voteFooter} />
    </div>
  )
}
