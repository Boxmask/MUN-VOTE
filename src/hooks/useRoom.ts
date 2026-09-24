import { useEffect, useState } from 'react'
import type { Room } from '../types'
import { finishVoteIfReady, subscribeRoom } from '../lib/rooms'

export function useRoom(seed: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!seed) {
      setLoading(false)
      setError('Missing seed.')
      return
    }

    setLoading(true)
    setError(null)

    let unsub: (() => void) | undefined
    try {
      unsub = subscribeRoom(seed, (data) => {
        setRoom(data)
        setLoading(false)
        if (!data) setError('Room not found. Check the seed number.')
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
      setLoading(false)
    }

    return () => unsub?.()
  }, [seed])

  useEffect(() => {
    if (!seed || room?.status !== 'voting' || typeof room.autoCloseAt !== 'number') return

    const delay = Math.max(0, room.autoCloseAt - Date.now())
    const timeout = window.setTimeout(() => {
      void finishVoteIfReady(seed)
    }, delay)

    return () => window.clearTimeout(timeout)
  }, [room?.autoCloseAt, room?.status, seed])

  return { room, loading, error }
}
