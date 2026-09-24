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

let serverTimeOffset = 0
let serverTimeOffsetSubscribed = false

// .info paths only work with listeners; get() on them is rejected with "Invalid token in path".
function getServerNow(): number {
  if (!serverTimeOffsetSubscribed) {
    serverTimeOffsetSubscribed = true
    onValue(ref(getDb(), '.info/serverTimeOffset'), (snap) => {
      const offset = snap.val()
      serverTimeOffset = typeof offset === 'number' ? offset : 0
    })
  }
  return Date.now() + serverTimeOffset
}

export function getAutoCloseDelay(autoCloseAt: number): number {
  return Math.max(0, autoCloseAt - getServerNow())
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
    const result = await runTransaction(
      ref(db, `rooms/${seed}`),
      (current) => {
        if (current !== null) return
        return room
      },
      { applyLocally: false },
    )
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

class RoomUpdateRejected extends Error {}

export class AutoCloseTooEarly extends RoomUpdateRejected {}

async function updateRoom(seed: string, mutate: (room: Room) => Room): Promise<Room> {
  let rejection = null as RoomUpdateRejected | null
  // The first attempt runs against the local cache, which is null when this client has not
  // loaded the room yet. Returning null lets the server reply with the real value and retry.
  // applyLocally: false keeps listeners on confirmed server state, so a rejected write never
  // flashes an unconfirmed status (results -> voting -> results) on screen.
  const result = await runTransaction(
    roomRef(seed),
    (current: Room | null) => {
      rejection = null
      if (current === null) return null
      try {
        return mutate(current)
      } catch (e) {
        if (e instanceof RoomUpdateRejected) {
          rejection = e
          return
        }
        throw e
      }
    },
    { applyLocally: false },
  )

  if (rejection) throw rejection
  if (!result.committed) throw new Error('Request failed. Please try again.')
  if (!result.snapshot.exists()) throw new Error('Room not found. Check the seed number.')
  return result.snapshot.val() as Room
}

function reject(message: string): never {
  throw new RoomUpdateRejected(message)
}

function clearVotes(voters: Record<string, Voter> | undefined): Record<string, Voter> {
  const cleared: Record<string, Voter> = {}
  for (const [id, voter] of Object.entries(voters ?? {})) {
    cleared[id] = { vote: null, joinedAt: voter.joinedAt }
  }
  return cleared
}

function requireHost(room: Room, hostKey: string) {
  if (room.hostKey !== hostKey) reject('Host permission required.')
}

export async function joinRoom(seed: string, voterId: string): Promise<void> {
  const id = voterId.trim()
  if (!id) throw new Error('Enter a country / delegate ID.')
  if (id.length > MAX_VOTER_ID_LENGTH) {
    throw new Error(`ID must be ${MAX_VOTER_ID_LENGTH} characters or fewer.`)
  }
  if (/[.#$/[\]]/.test(id)) {
    throw new Error('ID cannot contain . # $ / [ or ].')
  }

  await updateRoom(seed, (room) => {
    if (room.voters?.[id]) reject('That ID is already taken. Choose another.')
    if (room.status !== 'lobby') reject('Join before the host starts the vote.')
    return {
      ...room,
      voters: { ...(room.voters ?? {}), [id]: { vote: null, joinedAt: Date.now() } },
    }
  })

  localStorage.setItem(voterIdStorageKey(seed), id)
}

export async function startVote(seed: string, hostKey: string, topic: string): Promise<void> {
  const trimmed = topic.trim()
  if (!trimmed) throw new Error('Enter a topic.')

  await updateRoom(seed, (room) => {
    requireHost(room, hostKey)
    if (room.status !== 'lobby') reject('A vote is already running.')
    return {
      ...room,
      topic: trimmed,
      status: 'voting' satisfies RoomStatus,
      voters: clearVotes(room.voters),
      autoCloseAt: null,
      closeReason: null,
    }
  })
}

export async function castVote(
  seed: string,
  voterId: string,
  choice: VoteChoice,
): Promise<void> {
  await updateRoom(seed, (room) => {
    if (room.status !== 'voting') reject('Voting is not open.')
    const voter = room.voters?.[voterId]
    if (!voter) reject('You are not enrolled in this room.')
    if (voter.vote != null) reject('You already voted. Votes cannot be changed.')

    const voters = { ...room.voters, [voterId]: { ...voter, vote: choice } }
    const allVoted = Object.values(voters).every((entry) => entry.vote != null)

    return {
      ...room,
      voters,
      autoCloseAt: allVoted ? getServerNow() + AUTO_CLOSE_DELAY_MS : null,
      closeReason: null,
    }
  })
}

export async function finishVoteIfReady(seed: string): Promise<void> {
  try {
    await updateRoom(seed, (room) => {
      if (room.status !== 'voting' || typeof room.autoCloseAt !== 'number') reject('Not pending.')
      if (room.autoCloseAt > getServerNow()) throw new AutoCloseTooEarly('Too early.')

      const voters = Object.values(room.voters ?? {})
      const allVoted = voters.length > 0 && voters.every((voter) => voter.vote != null)
      if (!allVoted) return { ...room, autoCloseAt: null }

      return {
        ...room,
        status: 'results' satisfies RoomStatus,
        closeReason: 'all-voted' as const,
      }
    })
  } catch (e) {
    if (!(e instanceof RoomUpdateRejected) || e instanceof AutoCloseTooEarly) throw e
  }
}

export async function endVote(seed: string, hostKey: string): Promise<void> {
  await updateRoom(seed, (room) => {
    requireHost(room, hostKey)
    if (room.status !== 'voting') reject('Voting is not open.')
    return {
      ...room,
      status: 'results' satisfies RoomStatus,
      autoCloseAt: null,
      closeReason: 'host' as const,
    }
  })
}

export async function resetToLobby(seed: string, hostKey: string): Promise<void> {
  await updateRoom(seed, (room) => {
    requireHost(room, hostKey)
    if (room.status !== 'results') reject('End the current vote first.')
    return {
      ...room,
      topic: '',
      status: 'lobby' satisfies RoomStatus,
      voters: clearVotes(room.voters),
      autoCloseAt: null,
      closeReason: null,
    }
  })
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
