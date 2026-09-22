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
      setError(e instanceof Error ? e.message : '방 생성 실패')
    } finally {
      setBusy(false)
    }
  }

  function onJoin(e: FormEvent) {
    e.preventDefault()
    const seed = joinSeed.replace(/\D/g, '').slice(0, 6)
    if (seed.length !== 6) {
      setError('6자리 Seed number를 입력해 주세요.')
      return
    }
    navigate(`/join/${seed}`)
  }

  return (
    <div className="home">
      <div className="home-atmosphere" aria-hidden />
      <main className="home-main">
        <p className="home-brand">MUN Voting</p>
        <h1 className="home-headline">실시간 위원회 전자투표</h1>
        <p className="home-sub">
          호스트가 테이블을 열면 Seed가 발급됩니다. 대표단은 Seed로 입장해 찬성·반대·기권을
          한 번만 행사합니다.
        </p>

        <div className="home-actions">
          <button type="button" className="btn btn--primary" disabled={busy} onClick={onCreate}>
            {busy ? '테이블 여는 중…' : 'Voting Table 열기'}
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
          <h2>화면 공유할 때 (Mac / Zoom / AirPlay)</h2>
          <p>
            호스트 조작 화면과 공유용 전광판을 분리했습니다. Table을 연 뒤{' '}
            <strong>전광판 열기</strong>로 새 창을 띄우고, 그 창만 공유하세요.
          </p>
          <Link to="/guide">공유 방법 자세히 보기</Link>
        </div>
      </main>
    </div>
  )
}
