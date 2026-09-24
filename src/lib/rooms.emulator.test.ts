import { get, onValue, ref, set } from 'firebase/database'
import { beforeAll, describe, expect, it } from 'vitest'
import { getDb } from './firebase'
import { castVote, createRoom, endVote, finishVoteIfReady, joinRoom, resetToLobby, startVote } from './rooms'
import type { Room } from '../types'

beforeAll(() => {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size
    },
  }
})

async function readRoom(seed: string): Promise<Room> {
  return (await get(ref(getDb(), `rooms/${seed}`))).val() as Room
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe('vote lifecycle against the database emulator', () => {
  it('lets the host force-close a vote', async () => {
    const { seed, hostKey } = await createRoom()
    await joinRoom(seed, 'Korea')
    await joinRoom(seed, 'Japan')
    await startVote(seed, hostKey, 'Resolution A')
    await castVote(seed, 'Korea', 'yes')

    await endVote(seed, hostKey)

    const room = await readRoom(seed)
    expect(room.status).toBe('results')
    expect(room.closeReason).toBe('host')
    expect(room.voters.Korea.vote).toBe('yes')
  })

  it('closes 3 seconds after everyone has voted', async () => {
    const { seed, hostKey } = await createRoom()
    await joinRoom(seed, 'Korea')
    await joinRoom(seed, 'Japan')
    await startVote(seed, hostKey, 'Resolution B')
    await castVote(seed, 'Korea', 'no')
    await castVote(seed, 'Japan', 'abstain')

    let room = await readRoom(seed)
    expect(room.status).toBe('voting')
    expect(typeof room.autoCloseAt).toBe('number')

    await expect(finishVoteIfReady(seed)).rejects.toThrow('Too early')
    expect((await readRoom(seed)).status).toBe('voting')

    const statuses: string[] = []
    const unsubscribe = onValue(ref(getDb(), `rooms/${seed}`), (snap) => {
      const status = (snap.val() as Room).status
      if (statuses.at(-1) !== status) statuses.push(status)
    })

    await sleep(3_200)
    await Promise.all(Array.from({ length: 5 }, () => finishVoteIfReady(seed)))
    await sleep(300)
    unsubscribe()
    expect(statuses).toEqual(['voting', 'results'])

    room = await readRoom(seed)
    expect(room.status).toBe('results')
    expect(room.closeReason).toBe('all-voted')

    await resetToLobby(seed, hostKey)
    room = await readRoom(seed)
    expect(room.status).toBe('lobby')
    expect(room.voters.Korea.vote ?? null).toBeNull()
  }, 10_000)

  it('rejects a second vote from the same delegate', async () => {
    const { seed, hostKey } = await createRoom()
    await joinRoom(seed, 'Korea')
    await joinRoom(seed, 'Japan')
    await startVote(seed, hostKey, 'Resolution C')
    await castVote(seed, 'Korea', 'yes')
    await expect(castVote(seed, 'Korea', 'no')).rejects.toThrow('already voted')
    await expect(set(ref(getDb(), `rooms/${seed}/voters/Korea/vote`), 'no')).rejects.toThrow(
      /permission denied/i,
    )
    await expect(set(ref(getDb(), `rooms/${seed}/status`), 'lobby')).rejects.toThrow(
      /permission denied/i,
    )
  })
})
