import { useState, useEffect } from 'react'
import { FLEET, isValidPlacement, shipCells, generateRandomPlacement } from './boardStore'
import type { PlacedShip, ShipDef } from './boardStore'

export interface PreviewCell {
  row: number
  col: number
  valid: boolean
}

export function usePlacement() {
  const [placed, setPlaced]           = useState<PlacedShip[]>([])
  const [selected, setSelected]       = useState<ShipDef | null>(null)
  const [horizontal, setHorizontal]   = useState(true)
  const [hoverPos, setHoverPos]       = useState<{ row: number; col: number } | null>(null)

  // Klawisz R obraca aktualnie wybrany statek
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === 'r' || e.key === 'R') && selected) {
        setHorizontal(h => !h)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selected])

  // Statki jeszcze do rozstawienia (lista instancji)
  const remaining: ShipDef[] = FLEET.flatMap(def => {
    const alreadyPlaced = placed.filter(p => p.defId === def.id).length
    return Array<ShipDef>(def.count - alreadyPlaced).fill(def)
  })

  const allPlaced = remaining.length === 0

  // Zestaw zajętych komórek (bez strefy buforowej)
  function getOccupiedSet(): Set<string> {
    const s = new Set<string>()
    for (const ship of placed) {
      const def = FLEET.find(d => d.id === ship.defId)!
      for (const [r, c] of shipCells(ship, def.size)) {
        s.add(`${r},${c}`)
      }
    }
    return s
  }

  // Podgląd statku przy hover
  const preview: PreviewCell[] = []
  if (selected && hoverPos) {
    const valid = isValidPlacement(placed, hoverPos.row, hoverPos.col, selected.size, horizontal)
    for (let i = 0; i < selected.size; i++) {
      preview.push({
        row: hoverPos.row + (horizontal ? 0 : i),
        col: hoverPos.col + (horizontal ? i : 0),
        valid,
      })
    }
  }

  // Kliknięcie w planszę – postaw statek
  function placeShip(row: number, col: number) {
    if (!selected) return
    if (!isValidPlacement(placed, row, col, selected.size, horizontal)) return

    const newPlaced = [...placed, { defId: selected.id, row, col, horizontal }]
    setPlaced(newPlaced)

    // Automatycznie wybierz następny nierozstawiony statek
    const nextRemaining = FLEET.flatMap(def => {
      const count = newPlaced.filter(p => p.defId === def.id).length
      return Array<ShipDef>(def.count - count).fill(def)
    })
    setSelected(nextRemaining[0] ?? null)
  }

  // Losowe rozmieszczenie
  function randomize() {
    const result = generateRandomPlacement()
    setPlaced(result)
    setSelected(null)
  }

  // Reset planszy
  function reset() {
    setPlaced([])
    setSelected(remaining[0] ?? FLEET[0]!)
    setHorizontal(true)
    setHoverPos(null)
  }

  return {
    placed,
    selected,
    horizontal,
    hoverPos,
    allPlaced,
    remaining,
    preview,
    getOccupiedSet,
    selectShip: setSelected,
    toggleOrientation: () => setHorizontal(h => !h),
    setHoverPos,
    placeShip,
    randomize,
    reset,
  }
}
