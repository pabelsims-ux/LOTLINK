export enum PlayStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  CONFIRMED = 'confirmed',
  REJECTED = 'rejected',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum BetType {
  QUINIELA = 'quiniela',
  PALE = 'pale',
  TRIPLETA = 'tripleta',
  PEGA3 = 'pega3',
  TOCA3 = 'toca3',
  STRAIGHT = 'straight',
  BOX = 'box',
}

export enum Currency {
  DOP = 'DOP',
  USD = 'USD',
}

export enum OutgoingRequestStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  CONFIRMED = 'confirmed',
}
