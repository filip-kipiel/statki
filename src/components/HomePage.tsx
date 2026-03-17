import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Profile {
  username:     string
  total_points: number
  games_played: number
  games_won:    number
}

interface Props {
  username: string
  onNewGame: () => void
  onSignOut: () => void
}

export function HomePage({ username, onNewGame, onSignOut }: Props) {
  const [board, setBoard]   = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('username, total_points, games_played, games_won')
        .order('total_points', { ascending: false })
        .limit(20)
      if (data) setBoard(data as Profile[])
      setLoading(false)
    }
    void load()
  }, [])

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-6 gap-8 max-w-2xl mx-auto">

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

      {/* Przycisk nowej gry */}
      <button
        onClick={onNewGame}
        className="w-full py-5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xl rounded-2xl transition-all shadow-lg shadow-blue-900/30"
      >
        ⚔️ NOWA GRA
      </button>

      {/* Leaderboard */}
      <div className="w-full flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gray-300">🏆 Ranking graczy</h2>

        {loading ? (
          <p className="text-gray-600 text-sm">Ładowanie rankingu…</p>
        ) : board.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-8">
            Brak rozegranych gier — zagraj jako pierwszy!
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {board.map((p, i) => {
              const isMe = p.username === username
              const winRate = p.games_played > 0
                ? Math.round((p.games_won / p.games_played) * 100)
                : 0

              return (
                <div
                  key={p.username}
                  className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                    isMe
                      ? 'bg-blue-900/30 border border-blue-700/50'
                      : 'bg-gray-800/60'
                  }`}
                >
                  {/* Pozycja */}
                  <span className={`w-7 text-center font-bold text-sm shrink-0 ${
                    i === 0 ? 'text-yellow-400 text-lg' :
                    i === 1 ? 'text-gray-300 text-lg' :
                    i === 2 ? 'text-amber-600 text-lg' :
                    'text-gray-600'
                  }`}>
                    {i < 3 ? medals[i] : `${i + 1}.`}
                  </span>

                  {/* Nazwa */}
                  <span className={`flex-1 font-medium truncate ${isMe ? 'text-blue-300' : 'text-white'}`}>
                    {p.username}
                    {isMe && <span className="text-gray-500 text-xs ml-1">(Ty)</span>}
                  </span>

                  {/* Punkty */}
                  <span className="text-blue-400 font-bold text-lg w-16 text-right">
                    {p.total_points} <span className="text-xs text-gray-500 font-normal">pkt</span>
                  </span>

                  {/* Statystyki */}
                  <div className="text-right text-xs text-gray-500 w-20 shrink-0">
                    <div>{p.games_won}W / {p.games_played - p.games_won}L</div>
                    <div className="text-gray-600">{winRate}% WR</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
