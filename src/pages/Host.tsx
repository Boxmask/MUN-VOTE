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
    return <div className="page-status">테이블 불러오는 중…</div>
  }

  if (error || !room) {
    return (
      <div className="page-status page-status--error">
        <p>{error ?? '방을 찾을 수 없습니다.'}</p>
        <Link to="/">홈으로</Link>
      </div>
    )
  }

  if (!hostKey || hostKey !== room.hostKey) {
    return (
      <div className="page-status page-status--error">
        <p>
          이 브라우저에는 호스트 권한이 없습니다. Table을 연 기기에서만 조작할 수 있습니다.
        </p>
        <p className="muted">
          전광판만 보려면 <Link to={`/display/${seed}`}>전광판 열기</Link>
        </p>
        <Link to="/">홈으로</Link>
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
      setMessage(e instanceof Error ? e.message : '요청 실패')
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
      setMessage('전광판 링크를 복사했습니다.')
    } catch {
      setMessage(displayUrl)
    }
  }

  const voterIds = Object.keys(room.voters ?? {}).sort((a, b) =>
    a.localeCompare(b, 'ko', { sensitivity: 'base' }),
  )

  return (
    <div className="host-layout">
      <aside className="host-panel">
        <div className="host-panel-brand">
          <Link to="/">MUN Voting</Link>
          <span>호스트 콘솔</span>
        </div>

        <div className="host-seed-block">
          <p className="label">Seed number</p>
          <p className="host-seed">{seed}</p>
          <p className="hint">대표단에게 이 번호를 알려 주세요.</p>
        </div>

        <div className="host-share-card">
          <h2>화면 공유용 전광판</h2>
          <p>
            Zoom / FaceTime / AirPlay에서는 <strong>이 조작 화면이 아니라 전광판 창만</strong> 공유하세요.
          </p>
          <div className="host-share-actions">
            <button type="button" className="btn btn--primary" onClick={openDisplay}>
              전광판 열기
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => void copyDisplayLink()}>
              링크 복사
            </button>
          </div>
          <Link className="host-guide-link" to="/guide">
            Mac에서 창만 공유하는 방법
          </Link>
        </div>

        {room.status === 'lobby' && (
          <form className="host-form" onSubmit={onStart}>
            <label htmlFor="topic">Topic</label>
            <textarea
              id="topic"
              rows={3}
              placeholder="예: 결의안 초안 A에 대한 투표"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
            />
            <button type="submit" className="btn btn--primary" disabled={busy || !topic.trim()}>
              Vote 시작
            </button>
          </form>
        )}

        {room.status === 'voting' && (
          <div className="host-form">
            <p className="live-topic">{room.topic}</p>
            <p className="hint">
              투표 현황 {t.cast}/{t.total}
              {t.pending > 0 ? ` · 미투표 ${t.pending}` : ''}
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
            <p className="hint">결과 표시 중 · 다음 Topic으로 넘어가려면 아래를 누르세요.</p>
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
              새 Topic으로
            </button>
          </div>
        )}

        {message && <p className="host-message">{message}</p>}

        <div className="host-roster">
          <div className="host-roster-head">
            <h2>참석 명단</h2>
            <span>{voterIds.length}명</span>
          </div>
          <ul>
            {voterIds.length === 0 && <li className="empty">아직 입장한 대표가 없습니다.</li>}
            {voterIds.map((id) => {
              const vote = room.voters[id]?.vote
              return (
                <li key={id}>
                  <span className="roster-id">{id}</span>
                  <span className={`roster-vote roster-vote--${vote ?? 'none'}`}>
                    {vote === 'yes' ? '찬성' : vote === 'no' ? '반대' : vote === 'abstain' ? '기권' : '대기'}
                  </span>
                  {room.status === 'lobby' && (
                    <button
                      type="button"
                      className="roster-remove"
                      disabled={busy}
                      onClick={() => void run(() => removeVoter(seed, hostKey, id))}
                    >
                      제거
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <section className="host-preview" aria-label="미리보기">
        <div className="host-preview-label">미리보기 (공유용 아님)</div>
        <BoardShell room={room} seed={seed} showSeed />
      </section>
    </div>
  )
}
