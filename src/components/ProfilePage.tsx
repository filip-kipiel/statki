import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface GameRow {
  id:           string
  player1_id:   string
  player2_id:   string
  winner:       string | null
  winner_points: number | null
  created_at:   string
  p1_username:  string
  p2_username:  string
}

interface Achievement {
  achievement_id: string
  earned_at:      string
}

const ACHIEVEMENT_META: Record<string, { name: string; desc: string; emoji: string }> = {
  debiutant:      { name: 'Debiutant',      desc: 'Zagraj pierwszą grę',                emoji: '⚓' },
  zwyciezca:      { name: 'Zwycięzca',      desc: 'Wygraj pierwszą grę',               emoji: '🏆' },
  snajper:        { name: 'Snajper',         desc: 'Wygraj w mniej niż 30 strzałach',   emoji: '🎯' },
  niezniszczalny: { name: 'Niezniszczalny',  desc: 'Wygraj bez straty żadnego statku',  emoji: '🛡' },
  weteran:        { name: 'Weteran',         desc: 'Wygraj 10 gier',                    emoji: '⭐' },
  admiral:        { name: 'Admirał',         desc: 'Wygraj 25 gier',                    emoji: '👑' },
  pechowiec:      { name: 'Pechowiec',       desc: 'Pudłuj 10 razy pod rząd',           emoji: '💨' },
}

interface Props {
  userId:   string
  username: string
  onBack:   () => void
}

export function ProfilePage({ userId, username: initialUsername, onBack }: Props) {
  const [profile, setProfile]   = useState<{ username: string; total_points: number; games_played: number; games_won: number } | null>(null)
  const [games,   setGames]     = useState<GameRow[]>([])
  const [achiev,  setAchiev]    = useState<Achievement[]>([])
  const [loading, setLoading]   = useState(true)

  // Zmiana nazwy
  const [editName, setEditName] = useState(false)
  const [newName,  setNewName]  = useState(initialUsername)
  const [nameErr,  setNameErr]  = useState<string | null>(null)
  const [nameSaving, setNameSaving] = useState(false)

  useEffect(() => {
    void loadAll()
  }, [userId])

  async function loadAll() {
    setLoading(true)
    const [
      { data: prof },
      { data: gameRows },
      { data: achievRows },
    ] = await Promise.all([
      supabase.from('profiles').select('username,total_points,games_played,games_won').eq('id', userId).single(),
      supabase.rpc('get_player_games', { p_id: userId }).limit(20),
      supabase.from('player_achievements').select('achievement_id,earned_at').eq('player_id', userId).order('earned_at'),
    ])
    if (prof)       setProfile(prof as typeof profile)
    if (gameRows)   setGames(gameRows as GameRow[])
    if (achievRows) setAchiev(achievRows as Achievement[])
    setLoading(false)
  }

  async function saveUsername() {
    const trimmed = newName.trim()
    if (!trimmed || trimmed.length < 2) { setNameErr('Minimum 2 znaki'); return }
    if (trimmed.length > 20)           { setNameErr('Maksimum 20 znaków'); return }
    setNameSaving(true); setNameErr(null)
    const { error } = await supabase.from('profiles').update({ username: trimmed }).eq('id', userId)
    if (error) {
      setNameErr(error.message.includes('unique') ? 'Nazwa zajęta – wybierz inną' : 'Błąd zapisu')
    } else {
      setProfile(p => p ? { ...p, username: trimmed } : p)
      setEditName(false)
    }
    setNameSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Ładowanie profilu…</p>
      </div>
    )
  }

  const winRate = profile && profile.games_played > 0
    ? Math.round((profile.games_won / profile.games_played) * 100) : 0

  const earnedIds = new Set(achiev.map(a => a.achievement_id))

  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* Nagłówek */}
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-300 transition-colors text-xl">←</button>
          <h1 className="text-2xl font-bold">Profil</h1>
        </div>

        {/* Karta gracza */}
        <div className="bg-gray-800/60 rounded-2xl p-5 flex flex-col gap-4">
          {/* Avatar + nazwa */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-700 flex items-center justify-center text-2xl font-bold shrink-0">
              {(profile?.username ?? '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              {editName ? (
                <div className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && void saveUsername()}
                      maxLength={20}
                      autoFocus
                      className="flex-1 px-3 py-1.5 bg-gray-700 border border-gray-600 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                    <button onClick={() => void saveUsername()} disabled={nameSaving}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50">
                      {nameSaving ? '…' : 'Zapisz'}
                    </button>
                    <button onClick={() => { setEditName(false); setNewName(profile?.username ?? '') }}
                      className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg">
                      ✕
                    </button>
                  </div>
                  {nameErr && <p className="text-red-400 text-xs">{nameErr}</p>}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold truncate">{profile?.username}</h2>
                  <button onClick={() => { setEditName(true); setNewName(profile?.username ?? '') }}
                    className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                    ✏️
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Statystyki */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ['Punkty',   profile?.total_points ?? 0, 'text-blue-400'],
              ['Gier',     profile?.games_played ?? 0, 'text-gray-300'],
              ['Wygranych', profile?.games_won   ?? 0, 'text-green-400'],
              ['Win rate', `${winRate}%`,              'text-yellow-400'],
            ].map(([label, value, cls]) => (
              <div key={label as string} className="bg-gray-700/50 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
                <p className={`text-2xl font-bold mt-1 ${cls}`}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Odznaki */}
        <div className="bg-gray-800/60 rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-300">Odznaki</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(ACHIEVEMENT_META).map(([id, meta]) => {
              const earned = earnedIds.has(id)
              return (
                <div key={id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  earned ? 'bg-yellow-900/20 border-yellow-700/40' : 'bg-gray-700/30 border-gray-700/30 opacity-40'
                }`}>
                  <span className="text-2xl">{meta.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium">{meta.name}</p>
                    <p className="text-gray-400 text-xs truncate">{meta.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Historia gier */}
        <div className="bg-gray-800/60 rounded-2xl p-5 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-300">Ostatnie gry</h3>
          {games.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-4">Brak rozegranych gier.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {games.map(g => {
                const iWon = g.winner === userId
                const opponent = g.player1_id === userId ? g.p2_username : g.p1_username
                return (
                  <div key={g.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm ${
                    iWon ? 'bg-green-900/20 border border-green-800/40' : 'bg-red-900/10 border border-red-900/20'
                  }`}>
                    <span className={`font-bold w-8 ${iWon ? 'text-green-400' : 'text-red-400'}`}>{iWon ? 'W' : 'L'}</span>
                    <span className="flex-1 text-gray-300 truncate">vs {opponent ?? '—'}</span>
                    {iWon && g.winner_points != null && (
                      <span className="text-yellow-400 text-xs font-bold">+{g.winner_points} pkt</span>
                    )}
                    <span className="text-gray-600 text-xs shrink-0">
                      {new Date(g.created_at).toLocaleDateString('pl-PL')}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
