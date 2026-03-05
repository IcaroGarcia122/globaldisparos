export interface Campaign {
  id: string
  name: string
  instanceId: number
  userId: number
  status: 'running' | 'paused' | 'stopped' | 'completed'
  message: string
  contacts: Contact[]
  startedAt: Date
  finishedAt?: Date
  settings: CampaignSettings
  createdAt: Date
  updatedAt: Date
}

export interface CampaignSettings {
  speed: number // mensagens por minuto
  interval: number // segundos entre mensagens
  randomizeInterval: boolean
  minInterval?: number
  maxInterval?: number
}

export interface Contact {
  id: string
  phone: string
  name?: string
  status: 'pending' | 'sending' | 'sent' | 'delivered' | 'read' | 'error'
  sentAt?: Date
  deliveredAt?: Date
  readAt?: Date
  error?: string
}

export interface CampaignMetrics {
  total: number
  pending: number
  sending: number
  sent: number
  delivered: number
  read: number
  error: number
  successRate: number
  currentSpeed: number
  elapsedTime: number
  estimatedTime: number
}

export interface CampaignTimelineData {
  timestamp: Date
  sent: number
  delivered: number
  read: number
  error: number
}
