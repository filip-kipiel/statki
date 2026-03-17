// Definicje i logika sprawdzania odznak

import { supabase } from './supabase'
import type { PlacedShip } from '../store/boardStore'
import { FLEET, shipCells } from '../store/boardStore'

export interface AchievementDef {
  id:    string
  name:  string
  desc:  string
  emoji: string
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'debiutant',      name: 'Debiutant',       desc: 'Zagraj pierwszą grę',              emoji: '⚓' },
  { id: 'zwyciezca',      name: 'Zwycięzca',        desc: 'Wygraj pierwszą grę',              emoji: '🏆' },
  { id: 'snajper',        name: 'Snajper',          desc: 'Wygraj w mniej niż 30 strzałach',  emoji: '🎯' },
  { id: 'niezniszczalny', name: 'Niezniszczalny',   desc: 'Wygraj bez straty żadnego statku', emoji: '🛡' },
  { id: 'weteran',        name: 'Weteran',          desc: 'Wygraj 10 gier',                   emoji: '⭐' },
  { id: 'admiral',        name: 'Admirał',          desc: 'Wygraj 25 gier',                   emoji: '👑' },
  { id: 'pechowiec',      name: 'Pechowiec',        desc: 'Pudłuj 10 razy pod rząd',          emoji: '💨' },
]

interface GameEndData {
  gameId:       string
  myId:         string
  iWon:         boolean
  myShots:      Map<string, 'hit' | 'miss'>
  opponentShots: Map<string, 'hit' | 'miss'>
  myShips:      PlacedShip[]
  gamesWon:     number   // nowa wartość po aktualizacji rankingu
  gamesPlayed:  number
}

// Sprawdza czy któryś z moich statków ma jakiekolwiek trafienie
function anyMyShipHit(myShips: PlacedShip[], opponentShots: Map<string, 'hit' | 'miss'>): boolean {
  return myShips.some(ship => {
    const def = FLEET.find(d => d.id === ship.defId)!
    return shipCells(ship, def.size).some(([r, c]) => opponentShots.get(`${r},${c}`) === 'hit')
  })
}

// Zlicza najdłuższą serię pudłem gracza
function maxMissStreak(shots: Map<string, 'hit' | 'miss'>): number {
  let max = 0, cur = 0
  for (const v of shots.values()) {
    if (v === 'miss') { cur++; max = Math.max(max, cur) }
    else cur = 0
  }
  return max
}

// Pobiera już posiadane odznaki gracza z Supabase
async function getEarned(playerId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('player_achievements')
    .select('achievement_id')
    .eq('player_id', playerId)
  return new Set((data ?? []).map((r: { achievement_id: string }) => r.achievement_id))
}

// Zapisuje nowe odznaki do DB i zwraca ich definicje
export async function checkAndAwardAchievements(data: GameEndData): Promise<AchievementDef[]> {
  const earned = await getEarned(data.myId)
  const toAward: string[] = []

  const add = (id: string) => { if (!earned.has(id)) toAward.push(id) }

  // Debiutant – pierwsza gra
  if (data.gamesPlayed >= 1) add('debiutant')

  // Zwycięzca – pierwsza wygrana
  if (data.iWon && data.gamesWon >= 1) add('zwyciezca')

  // Snajper – wygrana w <30 strzałach
  if (data.iWon && data.myShots.size < 30) add('snajper')

  // Niezniszczalny – wygrana bez trafień w moje statki
  if (data.iWon && !anyMyShipHit(data.myShips, data.opponentShots)) add('niezniszczalny')

  // Weteran – 10 wygranych
  if (data.gamesWon >= 10) add('weteran')

  // Admirał – 25 wygranych
  if (data.gamesWon >= 25) add('admiral')

  // Pechowiec – 10 pudełek pod rząd (nawet w przegranej)
  if (maxMissStreak(data.myShots) >= 10) add('pechowiec')

  if (toAward.length === 0) return []

  await supabase.from('player_achievements').insert(
    toAward.map(id => ({ player_id: data.myId, achievement_id: id, game_id: data.gameId }))
  )

  return ACHIEVEMENTS.filter(a => toAward.includes(a.id))
}
