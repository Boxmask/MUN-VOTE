import { useEffect, useState } from 'react'
import type { Room } from '../types'
import { subscribeRoom } from '../lib/rooms'

export function useRoom(seed: string | undefined) {
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!seed) {
      setLoading(false)
      setError('Seed가 없습니다.')
      return
    }

    setLoading(true)
    setError(null)

    let unsub: (() => void) | undefined
    try {
      unsub = subscribeRoom(seed, (data) => {
        setRoom(data)
        setLoading(false)
        if (!data) setError('방을 찾을 수 없습니다. Seed number를 확인해 주세요.')
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : '연결 실패')
      setLoading(false)
    }

    return () => unsub?.()
  }, [seed])

  return { room, loading, error }
}
