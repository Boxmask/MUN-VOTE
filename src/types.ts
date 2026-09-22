export type VoteChoice = 'yes' | 'no' | 'abstain'
export type RoomStatus = 'lobby' | 'voting' | 'results'

export interface Voter {
  vote: VoteChoice | null
  joinedAt: number
}

export interface Room {
  createdAt: number
  hostKey: string
  topic: string
  status: RoomStatus
  voters: Record<string, Voter>
}

export const VOTE_LABEL: Record<VoteChoice, string> = {
  yes: '찬성',
  no: '반대',
  abstain: '기권',
}

export const VOTE_COLOR: Record<VoteChoice, string> = {
  yes: '#22c55e',
  no: '#ef4444',
  abstain: '#eab308',
}
