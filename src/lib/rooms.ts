import {
  get,
  onValue,
  ref,
  remove,
  runTransaction,
  type Unsubscribe,
} from 'firebase/database'
import { getDb } from './firebase'
import type { Room, RoomStatus, VoteChoice, Voter } from '../types'
import { MAX_VOTER_ID_LENGTH } from '../types'

const AUTO_CLOSE_DELAY_MS = 3_000

function roomRef(seed: string) {
  return ref(getDb(), `rooms/${seed}`)
}

async function getServerNow(): Promise<number> {
  const snapshot = await get(ref(getDb(), '.info/serverTimeOffset'))
  const offset = snapshot.val()
  return Date.now() + (typeof offset === 'number' ? offset : 0)
}

export async function getAutoCloseDelay(autoCloseAt: number): Promise<number> {
  return Math.max(0, autoCloseAt - (await getServerNow()))
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
    const hostKey = generateHostKey()
    const room: Room = {
      createdAt: Date.now(),
      hostKey,
      topic: '',
      status: 'lobby',
      voters: {},
    }
    const result = await runTransaction(ref(db, `rooms/${seed}`), (current) => {
      if (current !== null) return
      return room
    })
    if (!result.committed) continue

    localStorage.setItem(hostKeyStorageKey(seed), hostKey)
    return { seed, hostKey }
  }
  throw new Error('Could not create a seed. Please try again.')
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
  if (!id) throw new Error('Enter a country / delegate ID.')
  if (id.length > MAX_VOTER_ID_LENGTH) {
    throw new Error(`ID must be ${MAX_VOTER_ID_LENGTH} characters or fewer.`)
  }

  let rejection: 'missing' | 'closed' | 'duplicate' | null = null
  const result = await runTransaction(roomRef(seed), (current: Room | null) => {
    if (current === null) {
      rejection = 'missing'
      return
    }
    if (current.status !== 'lobby') {
      rejection = 'closed'
      return
    }
    if (current.voters?.[id]) {
      rejection = 'duplicate'
      return
    }

    const voter: Voter = { vote: null, joinedAt: Date.now() }
    return {
      ...current,
      voters: { ...(current.voters ?? {}), [id]: voter },
    }
  })

  if (!result.committed) {
    if (rejection === 'missing') throw new Error('That seed number does not exist.')
    if (rejection === 'closed') throw new Error('Join before the host starts the vote.')
    throw new Error('That ID is already taken. Choose another.')
  }

  localStorage.setItem(voterIdStorageKey(seed), id)
}

export async function startVote(seed: string, hostKey: string, topic: string): Promise<void> {
  const trimmed = topic.trim()
  if (!trimmed) throw new Error('Enter a topic.')

  const result = await runTransaction(roomRef(seed), (room: Room | null) => {
    if (room === null || room.hostKey !== hostKey || room.status !== 'lobby') return

    const clearedVoters: Record<string, Voter> = {}
    for (const [id, voter] of Object.entries(room.voters ?? {})) {
      clearedVoters[id] = { vote: null, joinedAt: voter.joinedAt }
    }

    return {
      ...room,
      topic: trimmed,
      status: 'voting' satisfies RoomStatus,
      voters: clearedVoters,
      autoCloseAt: null,
      closeReason: null,
    }
  })
  if (!result.committed) throw new Error('Could not start vote. Check host permission and state.')
}

export async function castVote(
  seed: string,
  voterId: string,
  choice: VoteChoice,
): Promise<void> {
  const autoCloseAt = (await getServerNow()) + AUTO_CLOSE_DELAY_MS
  let rejection: 'missing' | 'not-voting' | 'not-enrolled' | 'already-voted' | null = null
  const result = await runTransaction(roomRef(seed), (room: Room | null) => {
    if (room === null) {
      rejection = 'missing'
      return
    }
    if (room.status !== 'voting') {
      rejection = 'not-voting'
      return
    }
    const voter = room.voters?.[voterId]
    if (!voter) {
      rejection = 'not-enrolled'
      return
    }
    if (voter.vote != null) {
      rejection = 'already-voted'
      return
    }

    const voters = {
      ...room.voters,
      [voterId]: { ...voter, vote: choice },
    }
    const allVoted =
      Object.keys(voters).length > 0 && Object.values(voters).every((entry) => entry.vote != null)

    return {
      ...room,
      voters,
      autoCloseAt: allVoted ? autoCloseAt : null,
      closeReason: null,
    }
  })

  if (!result.committed) {
    if (rejection === 'missing') throw new Error('Room not found.')
    if (rejection === 'not-voting') throw new Error('Voting is not open.')
    if (rejection === 'not-enrolled') throw new Error('You are not enrolled in this room.')
    throw new Error('You already voted. Votes cannot be changed.')
  }
}

export async function finishVoteIfReady(seed: string): Promise<void> {
  const serverNow = await getServerNow()
  await runTransaction(roomRef(seed), (room: Room | null) => {
    if (
      room === null ||
      room.status !== 'voting' ||
      typeof room.autoCloseAt !== 'number' ||
      room.autoCloseAt > serverNow
    ) {
      return
    }

    const voters = Object.values(room.voters ?? {})
    const allVoted = voters.length > 0 && voters.every((voter) => voter.vote != null)
    if (!allVoted) return { ...room, autoCloseAt: null }

    return {
      ...room,
      status: 'results' satisfies RoomStatus,
      closeReason: 'all-voted' as const,
    }
  })
}

export async function endVote(seed: string, hostKey: string): Promise<void> {
  const result = await runTransaction(roomRef(seed), (room: Room | null) => {
    if (room === null || room.hostKey !== hostKey || room.status !== 'voting') return
    return {
      ...room,
      status: 'results' satisfies RoomStatus,
      autoCloseAt: null,
      closeReason: 'host' as const,
    }
  })
  if (!result.committed) throw new Error('Could not end vote. Check host permission and state.')
}

export async function resetToLobby(seed: string, hostKey: string): Promise<void> {
  const result = await runTransaction(roomRef(seed), (room: Room | null) => {
    if (room === null || room.hostKey !== hostKey || room.status !== 'results') return

    const clearedVoters: Record<string, Voter> = {}
    for (const [id, voter] of Object.entries(room.voters ?? {})) {
      clearedVoters[id] = { vote: null, joinedAt: voter.joinedAt }
    }

    return {
      ...room,
      topic: '',
      status: 'lobby' satisfies RoomStatus,
      voters: clearedVoters,
      autoCloseAt: null,
      closeReason: null,
    }
  })
  if (!result.committed) throw new Error('Could not reset vote. Check host permission and state.')
}

export async function removeVoter(seed: string, hostKey: string, voterId: string): Promise<void> {
  const snap = await get(roomRef(seed))
  if (!snap.exists()) throw new Error('Room not found.')
  const room = snap.val() as Room
  if (room.hostKey !== hostKey) throw new Error('Host permission required.')
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
