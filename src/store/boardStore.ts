// Stan planszy – typy i logika pól

export type CellState = 'empty' | 'ship' | 'hit' | 'miss'

export interface Cell {
  row: number   // 0–9
  col: number   // 0–9
  state: CellState
}

// Etykiety wierszy i kolumn
export const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J']
export const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']

// Tworzy pustą planszę 10×10
export function createEmptyBoard(): Cell[][] {
  return Array.from({ length: 10 }, (_, row) =>
    Array.from({ length: 10 }, (_, col) => ({ row, col, state: 'empty' as CellState }))
  )
}

// Przykładowe statki do testów (kilka pól oznaczonych jako 'ship')
export function createTestBoard(): Cell[][] {
  const board = createEmptyBoard()
  const shipCells: [number, number][] = [
    [0, 0], [0, 1], [0, 2],   // statek poziomy w wierszu A
    [3, 5], [4, 5], [5, 5],   // statek pionowy w kolumnie 6
    [7, 2], [7, 3],            // dwumasztowiec
  ]
  for (const [r, c] of shipCells) {
    board[r][c].state = 'ship'
  }
  return board
}
