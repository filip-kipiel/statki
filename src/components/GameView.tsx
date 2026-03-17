import { useGame } from '../store/useGame'
import { GameBoard } from './GameBoard'

interface Props {
  gameId: string
  myId: string
  opponentId: string
  myName: string
  onBackToLobby: () => void
}

export function GameView({ gameId, myId, opponentId, myName, onBackToLobby }: Props) {
  const {
    loading, isMyTurn, gameStatus, winner,
    myShips, opponentShips,
    myShots, opponentShots,
    shoot,
  } = useGame(gameId, myId, opponentId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Ładowanie gry…</p>
      </div>
    )
  }

  // Koniec gry
  if (gameStatus === 'finished') {
    const iWon = winner === myId
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center flex flex-col items-center gap-6">
          <div className="text-7xl">{iWon ? '🏆' : '💀'}</div>
          <h1 className={`text-4xl font-bold ${iWon ? 'text-yellow-400' : 'text-red-400'}`}>
            {iWon ? 'Wygrałeś!' : 'Przegrałeś!'}
          </h1>
          <button
            onClick={onBackToLobby}
            className="px-6 py-3 bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-xl transition-all"
          >
            Zagraj ponownie
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 gap-6">
      {/* Nagłówek z informacją o turze */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-white">⚓ Statki – {myName}</h1>
        <div className={`mt-2 px-4 py-1.5 rounded-full text-sm font-semibold inline-block transition-all ${
          isMyTurn
            ? 'bg-green-900/60 text-green-300 border border-green-700'
            : 'bg-gray-800 text-gray-400 border border-gray-700'
        }`}>
          {isMyTurn ? '🎯 Twoja tura – strzelaj!' : '⏳ Tura przeciwnika…'}
        </div>
      </div>

      {/* Dwie plansze obok siebie */}
      <div className="flex gap-8 items-start flex-wrap justify-center">
        {/* Moja plansza – widać moje statki + strzały przeciwnika */}
        <GameBoard
          label="Moja flota"
          ships={myShips}
          showShips={true}
          shots={opponentShots}
          isInteractive={false}
        />

        {/* Plansza przeciwnika – statki ukryte, można strzelać */}
        <GameBoard
          label={isMyTurn ? '🎯 Plansza przeciwnika' : 'Plansza przeciwnika'}
          ships={opponentShips}
          showShips={false}
          shots={myShots}
          isInteractive={isMyTurn}
          onShoot={shoot}
        />
      </div>

      {/* Liczniki trafień */}
      <div className="flex gap-8 text-sm text-gray-500">
        <span>Moje trafienia: <strong className="text-red-400">{[...myShots.values()].filter(r => r === 'hit').length}</strong></span>
        <span>Trafienia we mnie: <strong className="text-orange-400">{[...opponentShots.values()].filter(r => r === 'hit').length}</strong></span>
      </div>
    </div>
  )
}
