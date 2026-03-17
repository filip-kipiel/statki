// Zarządzanie sesją gracza – ID i pseudonim trzymane w sessionStorage

const PLAYER_ID_KEY   = 'statki_player_id'
const PLAYER_NAME_KEY = 'statki_player_name'

// Zwraca stały ID gracza (generuje nowy jeśli brak)
export function getPlayerId(): string {
  let id = sessionStorage.getItem(PLAYER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(PLAYER_ID_KEY, id)
  }
  return id
}

export function getPlayerName(): string {
  return sessionStorage.getItem(PLAYER_NAME_KEY) ?? ''
}

export function savePlayerName(name: string): void {
  sessionStorage.setItem(PLAYER_NAME_KEY, name.trim())
}

// Generuje 6-znakowy kod pokoju (np. "A3F9KL")
export function generateRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}
