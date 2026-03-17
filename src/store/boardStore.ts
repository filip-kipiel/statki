// Stan planszy – typy i logika pól

export type CellState = 'empty' | 'ship' | 'hit' | 'miss'

export interface Cell {
  row: number
  col: number
  state: CellState
}

// Definicja rodzaju statku
export interface ShipDef {
  id: string
  name: string
  size: number
  count: number
}

// Rozstawiony statek na planszy
export interface PlacedShip {
  defId: string
  row: number
  col: number
  horizontal: boolean
}

// Flota do rozstawienia
export const FLEET: ShipDef[] = [
  { id: 'carrier',    name: 'Lotniskowiec', size: 5, count: 1 },
  { id: 'battleship', name: 'Pancernik',    size: 4, count: 1 },
  { id: 'cruiser',    name: 'Krążownik',    size: 3, count: 2 },
  { id: 'destroyer',  name: 'Niszczyciel',  size: 2, count: 1 },
]

// Etykiety wierszy i kolumn
export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
export const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

// Zwraca listę komórek zajmowanych przez statek
export function shipCells(ship: PlacedShip, size: number): [number, number][] {
  return Array.from({ length: size }, (_, i) => [
    ship.row + (ship.horizontal ? 0 : i),
    ship.col + (ship.horizontal ? i : 0),
  ] as [number, number])
}

// Sprawdza czy pozycja jest prawidłowa (mieści się, nie nachodzi, nie styka)
export function isValidPlacement(
  placed: PlacedShip[],
  row: number,
  col: number,
  size: number,
  horizontal: boolean,
): boolean {
  // Sprawdź czy mieści się w planszy
  if (horizontal && col + size > 10) return false
  if (!horizontal && row + size > 10) return false

  // Zbuduj zestaw zajętych pól ze strefą buforową (1 pole dookoła)
  const blocked = new Set<string>()
  for (const ship of placed) {
    const def = FLEET.find(d => d.id === ship.defId)!
    for (const [r, c] of shipCells(ship, def.size)) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          blocked.add(`${r + dr},${c + dc}`)
        }
      }
    }
  }

  // Sprawdź czy nowe pola nie kolidują
  for (let i = 0; i < size; i++) {
    const r = row + (horizontal ? 0 : i)
    const c = col + (horizontal ? i : 0)
    if (blocked.has(`${r},${c}`)) return false
  }

  return true
}

// Losowe rozmieszczenie wszystkich statków
export function generateRandomPlacement(): PlacedShip[] {
  const result: PlacedShip[] = []
  for (const def of FLEET) {
    for (let n = 0; n < def.count; n++) {
      let placed = false
      let attempts = 0
      while (!placed && attempts < 2000) {
        const horizontal = Math.random() > 0.5
        const row = Math.floor(Math.random() * 10)
        const col = Math.floor(Math.random() * 10)
        if (isValidPlacement(result, row, col, def.size, horizontal)) {
          result.push({ defId: def.id, row, col, horizontal })
          placed = true
        }
        attempts++
      }
    }
  }
  return result
}
