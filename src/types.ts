export type VoteChoice = 'yes' | 'no' | 'abstain'
export type RoomStatus = 'lobby' | 'voting' | 'results'
export type CloseReason = 'all-voted' | 'host'

export interface Voter {
  vote?: VoteChoice | null
  joinedAt: number
}

export interface Room {
  createdAt: number
  hostKey: string
  topic: string
  status: RoomStatus
  voters: Record<string, Voter>
  autoCloseAt?: number | null
  closeReason?: CloseReason | null
}

export const VOTE_LABEL: Record<VoteChoice, string> = {
  yes: 'Yes',
  no: 'No',
  abstain: 'Abstain',
}

export const VOTE_COLOR: Record<VoteChoice, string> = {
  yes: '#22c55e',
  no: '#ef4444',
  abstain: '#eab308',
}

export const MAX_VOTER_ID_LENGTH = 64
