import { useState } from 'react'
import { supabase } from '../lib/supabase'
import type { BotDifficulty } from '../store/useBotGame'

interface Profile {
  username:     string
  total_points: number
  games_played: number
  games_won:    number
}

interface Props {
  username:   string
  isAdmin:    boolean
  onNewGame:  () => void
  onBotGame:  (difficulty: BotDifficulty) => void
  onAdmin:    () => void
  onSignOut:  () => void
}

export function HomePage({ username, isAdmin, onNewGame, onBotGame, onAdmin, onSignOut }: Props) {
  const [showBoard,    setShowBoard]    = useState(false)
  const [board,        setBoard]        = useState<Profile[]>([])
  const [loading,      setLoading]      = useState(false)
  const [showBotPicker, setShowBotPicker] = useState(false)

  async function loadBoard() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('username, total_points, games_played, games_won')
      .order('total_points', { ascending: false })
      .limit(20)
    if (data) setBoard(data as Profile[])
    setLoading(false)
  }

  function toggleBoard() {
    if (!showBoard) void loadBoard()
    setShowBoard(v => !v)
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 gap-6 max-w-4xl mx-auto w-full">

      {/* Nagłówek */}
      <div className="w-full flex items-center justify-between pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-wide">⚓ Statki</h1>
          <p className="text-gray-500 text-sm">Witaj, <span className="text-blue-300">{username}</span></p>
        </div>
        <button
          onClick={onSignOut}
          className="text-gray-600 hover:text-gray-400 text-sm transition-colors px-3 py-1 rounded-lg hover:bg-gray-800"
        >
          Wyloguj
        </button>
      </div>

      {/* Główne przyciski */}
      <div className="w-full flex flex-col gap-3 mt-4">
        <button
          onClick={onNewGame}
          className="w-full py-5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xl rounded-2xl transition-all shadow-lg shadow-blue-900/30"
        >
          ⚔️ ZAGRAJ Z GRACZEM
        </button>

        {/* Przycisk bota z pickerem trudności */}
        <div className="w-full flex flex-col gap-2">
          <button
            onClick={() => setShowBotPicker(v => !v)}
            className="w-full py-4 bg-gray-700 hover:bg-gray-600 active:scale-95 text-white font-bold text-lg rounded-2xl transition-all"
          >
            {showBotPicker ? '▲ Anuluj' : '🤖 ZAGRAJ Z BOTEM'}
          </button>

          {showBotPicker && (
            <div className="w-full flex flex-col gap-2 p-3 bg-gray-800/80 rounded-xl border border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-wide text-center mb-1">Wybierz poziom trudności</p>
              {([
                ['easy',   '🟢 Łatwy',   'Bot strzela losowo'],
                ['medium', '🟡 Średni',  'Co 4. strzał pewne trafienie'],
                ['hard',   '🔴 Trudny',  'Co 2. strzał pewne trafienie'],
              ] as const).map(([diff, label, desc]) => (
                <button
                  key={diff}
                  onClick={() => { setShowBotPicker(false); onBotGame(diff) }}
                  className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 active:scale-95 rounded-xl transition-all text-left flex items-center gap-3"
                >
                  <span className="font-bold text-white text-sm">{label}</span>
                  <span className="text-gray-400 text-xs">{desc}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleBoard}
          className="w-full py-4 bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-bold text-lg rounded-2xl transition-all"
        >
          {showBoard ? '▲ Ukryj ranking' : '🏆 POKAŻ LEADERBOARD'}
        </button>

        {isAdmin && (
          <button
            onClick={onAdmin}
            className="w-full py-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-400 hover:text-white font-medium text-sm rounded-xl transition-all"
          >
            🛡 Panel Admina
          </button>
        )}
      </div>

      {/* Leaderboard – widoczny po kliknięciu */}
      {showBoard && (
        <div className="w-full flex flex-col gap-2">
          <h2 className="text-base font-semibold text-gray-400">Ranking graczy</h2>

          {loading ? (
            <p className="text-gray-600 text-sm py-4 text-center">Ładowanie…</p>
          ) : board.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-8">
              Brak rozegranych gier — zagraj jako pierwszy!
            </p>
          ) : (
            board.map((p, i) => {
              const isMe = p.username === username
              const winRate = p.games_played > 0
                ? Math.round((p.games_won / p.games_played) * 100) : 0
              return (
                <div
                  key={p.username}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl ${
                    isMe ? 'bg-blue-900/30 border border-blue-700/50' : 'bg-gray-800/60'
                  }`}
                >
                  <span className={`w-7 text-center font-bold shrink-0 ${
                    i === 0 ? 'text-yellow-400 text-lg' :
                    i === 1 ? 'text-gray-300 text-lg' :
                    i === 2 ? 'text-amber-600 text-lg' : 'text-gray-600 text-sm'
                  }`}>
                    {i < 3 ? medals[i] : `${i + 1}.`}
                  </span>
                  <span className={`flex-1 font-medium truncate ${isMe ? 'text-blue-300' : 'text-white'}`}>
                    {p.username}{isMe && <span className="text-gray-500 text-xs ml-1">(Ty)</span>}
                  </span>
                  <span className="text-blue-400 font-bold w-16 text-right">
                    {p.total_points} <span className="text-xs text-gray-500 font-normal">pkt</span>
                  </span>
                  <div className="text-right text-xs text-gray-500 w-20 shrink-0">
                    <div>{p.games_won}W / {p.games_played - p.games_won}L</div>
                    <div>{winRate}% WR</div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
