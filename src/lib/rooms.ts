import {
  get,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
  type Unsubscribe,
} from 'firebase/database'
import { getDb } from './firebase'
import type { Room, RoomStatus, VoteChoice, Voter } from '../types'

function roomRef(seed: string) {
  return ref(getDb(), `rooms/${seed}`)
}

export function generateSeed(): string {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export function generateHostKey(): string {
  return crypto.randomUUID()
}

export function hostKeyStorageKey(seed: string) {
  return `mun-host-key:${seed}`
}

export function voterIdStorageKey(seed: string) {
  return `mun-voter-id:${seed}`
}

export async function createRoom(): Promise<{ seed: string; hostKey: string }> {
  const db = getDb()
  for (let i = 0; i < 8; i++) {
    const seed = generateSeed()
    const snap = await get(ref(db, `rooms/${seed}`))
    if (snap.exists()) continue

    const hostKey = generateHostKey()
    const room: Room = {
      createdAt: Date.now(),
      hostKey,
      topic: '',
      status: 'lobby',
      voters: {},
    }
    await set(ref(db, `rooms/${seed}`), room)
    localStorage.setItem(hostKeyStorageKey(seed), hostKey)
    return { seed, hostKey }
  }
  throw new Error('시드 생성에 실패했습니다. 다시 시도해 주세요.')
}

export function subscribeRoom(
  seed: string,
  onData: (room: Room | null) => void,
): Unsubscribe {
  return onValue(roomRef(seed), (snap) => {
    onData(snap.exists() ? (snap.val() as Room) : null)
  })
}

export async function joinRoom(seed: string, voterId: string): Promise<void> {
  const id = voterId.trim()
  if (!id) throw new Error('ID를 입력해 주세요.')
  if (id.length > 24) throw new Error('ID는 24자 이하여야 합니다.')

  const snap = await get(roomRef(seed))
  if (!snap.exists()) throw new Error('존재하지 않는 Seed number입니다.')

  const result = await runTransaction(ref(getDb(), `rooms/${seed}/voters/${id}`), (current) => {
    if (current !== null) return undefined
    const voter: Voter = { vote: null, joinedAt: Date.now() }
    return voter
  })

  if (!result.committed) {
    throw new Error('이미 사용 중인 ID입니다. 다른 이름을 입력해 주세요.')
  }

  localStorage.setItem(voterIdStorageKey(seed), id)
}

export async function startVote(seed: string, hostKey: string, topic: string): Promise<void> {
  const trimmed = topic.trim()
  if (!trimmed) throw new Error('Topic을 입력해 주세요.')

  const snap = await get(roomRef(seed))
  if (!snap.exists()) throw new Error('방을 찾을 수 없습니다.')
  const room = snap.val() as Room
  if (room.hostKey !== hostKey) throw new Error('호스트 권한이 없습니다.')

  const clearedVoters: Record<string, Voter> = {}
  for (const [id, voter] of Object.entries(room.voters ?? {})) {
    clearedVoters[id] = { vote: null, joinedAt: voter.joinedAt }
  }

  await update(roomRef(seed), {
    topic: trimmed,
    status: 'voting' satisfies RoomStatus,
    voters: clearedVoters,
  })
}

export async function castVote(
  seed: string,
  voterId: string,
  choice: VoteChoice,
): Promise<void> {
  const votePath = ref(getDb(), `rooms/${seed}/voters/${voterId}/vote`)
  const result = await runTransaction(votePath, (current) => {
    if (current !== null) return
    return choice
  })

  if (!result.committed) {
    throw new Error('이미 투표했습니다. 번복할 수 없습니다.')
  }

  await maybeFinishWhenAllVoted(seed)
}

async function maybeFinishWhenAllVoted(seed: string): Promise<void> {
  const snap = await get(roomRef(seed))
  if (!snap.exists()) return
  const room = snap.val() as Room
  if (room.status !== 'voting') return

  const voters = Object.values(room.voters ?? {})
  if (voters.length === 0) return
  if (voters.every((v) => v.vote !== null)) {
    await update(roomRef(seed), { status: 'results' satisfies RoomStatus })
  }
}

export async function endVote(seed: string, hostKey: string): Promise<void> {
  const snap = await get(roomRef(seed))
  if (!snap.exists()) throw new Error('방을 찾을 수 없습니다.')
  const room = snap.val() as Room
  if (room.hostKey !== hostKey) throw new Error('호스트 권한이 없습니다.')
  await update(roomRef(seed), { status: 'results' satisfies RoomStatus })
}

export async function resetToLobby(seed: string, hostKey: string): Promise<void> {
  const snap = await get(roomRef(seed))
  if (!snap.exists()) throw new Error('방을 찾을 수 없습니다.')
  const room = snap.val() as Room
  if (room.hostKey !== hostKey) throw new Error('호스트 권한이 없습니다.')

  const clearedVoters: Record<string, Voter> = {}
  for (const [id, voter] of Object.entries(room.voters ?? {})) {
    clearedVoters[id] = { vote: null, joinedAt: voter.joinedAt }
  }

  await update(roomRef(seed), {
    topic: '',
    status: 'lobby' satisfies RoomStatus,
    voters: clearedVoters,
  })
}

export async function removeVoter(seed: string, hostKey: string, voterId: string): Promise<void> {
  const snap = await get(roomRef(seed))
  if (!snap.exists()) throw new Error('방을 찾을 수 없습니다.')
  const room = snap.val() as Room
  if (room.hostKey !== hostKey) throw new Error('호스트 권한이 없습니다.')
  await remove(ref(getDb(), `rooms/${seed}/voters/${voterId}`))
}

export function tallyVotes(voters: Record<string, Voter> | undefined) {
  const list = Object.values(voters ?? {})
  const total = list.length
  let yes = 0
  let no = 0
  let abstain = 0
  let pending = 0

  for (const v of list) {
    if (v.vote === 'yes') yes++
    else if (v.vote === 'no') no++
    else if (v.vote === 'abstain') abstain++
    else pending++
  }

  const cast = yes + no + abstain
  const present = cast
  const pct = (n: number) => (cast === 0 ? 0 : (n / cast) * 100)

  return {
    total,
    present,
    yes,
    no,
    abstain,
    pending,
    cast,
    yesPct: pct(yes),
    noPct: pct(no),
    abstainPct: pct(abstain),
  }
}
