import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BoardShell } from '../components/BoardShell'
import { SetupGate } from '../components/SetupGate'
import { useRoom } from '../hooks/useRoom'
import { isFirebaseConfigured } from '../lib/firebase'
import { castVote, joinRoom, voterIdStorageKey } from '../lib/rooms'
import type { VoteChoice } from '../types'
import { VOTE_LABEL } from '../types'
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
    return <div className="join-status">테이블 찾는 중…</div>
  }

  if (error || !room) {
    return (
      <div className="join-status">
        <p>{error ?? '방을 찾을 수 없습니다.'}</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  async function onJoin(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      await joinRoom(seed, idInput)
      const id = idInput.trim()
      setMyId(id)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '입장 실패')
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
      setMessage(err instanceof Error ? err.message : '투표 실패')
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
              투표 완료 · <em data-vote={myVote}>{VOTE_LABEL[myVote]}</em> (번복 불가)
            </span>
          ) : (
            <span>하나를 선택하세요. 제출 후 변경할 수 없습니다.</span>
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
              찬성
            </button>
            <button
              type="button"
              className="vote-btn vote-btn--no"
              disabled={busy}
              onClick={() => void onVote('no')}
            >
              반대
            </button>
            <button
              type="button"
              className="vote-btn vote-btn--abstain"
              disabled={busy}
              onClick={() => void onVote('abstain')}
            >
              기권
            </button>
          </div>
        )}
        {message && <p className="join-message">{message}</p>}
      </div>
    ) : enrolled ? (
      <div className="vote-bar vote-bar--idle">
        <strong>{myId}</strong>
        <span>
          {room.status === 'lobby' && '호스트가 투표를 시작할 때까지 대기하세요.'}
          {room.status === 'results' && '결과가 집계되었습니다. 다음 Topic을 기다려 주세요.'}
        </span>
        {message && <p className="join-message">{message}</p>}
      </div>
    ) : null

  if (!enrolled) {
    return (
      <div className="join-gate">
        <div className="join-card">
          <p className="join-seed-label">Seed {seed}</p>
          <h1>대표단 입장</h1>
          <p className="join-lead">위원회에서 사용할 ID(국가명·대표명)를 입력하세요. 중복은 불가합니다.</p>
          <form onSubmit={onJoin}>
            <label htmlFor="voter-id">내 ID</label>
            <input
              id="voter-id"
              value={idInput}
              onChange={(e) => setIdInput(e.target.value)}
              maxLength={24}
              placeholder="예: Republic of Korea"
              autoFocus
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !idInput.trim()}>
              {busy ? '입장 중…' : '입장'}
            </button>
          </form>
          {message && <p className="join-message">{message}</p>}
          <Link to="/">다른 Seed로</Link>
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
