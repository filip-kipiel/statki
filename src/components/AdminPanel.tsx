import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface UserRow {
  id:           string
  email:        string
  username:     string
  is_admin:     boolean
  total_points: number
  games_played: number
  games_won:    number
  created_at:   string
}

interface Props {
  onBack: () => void
}

export function AdminPanel({ onBack }: Props) {
  const [users, setUsers]       = useState<UserRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [editId, setEditId]     = useState<string | null>(null)
  const [editEmail, setEditEmail] = useState('')
  const [working, setWorking]   = useState<string | null>(null) // id aktualnie przetwarzanego użytkownika

  useEffect(() => { void loadUsers() }, [])

  async function callAdmin(body: object) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(
      `${(import.meta.env.VITE_SUPABASE_URL as string).trim()}/functions/v1/admin-operations`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session!.access_token}`,
          'apikey': (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim(),
        },
        body: JSON.stringify(body),
      }
    )
    return res.json() as Promise<{ success?: boolean; users?: UserRow[]; error?: string }>
  }

  async function loadUsers() {
    setLoading(true); setError(null)
    const data = await callAdmin({ action: 'list-users' })
    if (data.error) { setError(data.error); setLoading(false); return }
    setUsers(data.users ?? [])
    setLoading(false)
  }

  async function deleteUser(userId: string, username: string) {
    if (!confirm(`Usunąć użytkownika "${username}"? Tej operacji nie można cofnąć.`)) return
    setWorking(userId)
    const data = await callAdmin({ action: 'delete-user', userId })
    if (data.error) { alert(`Błąd: ${data.error}`) }
    else { setUsers(u => u.filter(u => u.id !== userId)) }
    setWorking(null)
  }

  async function updateEmail(userId: string) {
    if (!editEmail.trim()) return
    setWorking(userId)
    const data = await callAdmin({ action: 'update-email', userId, email: editEmail.trim() })
    if (data.error) { alert(`Błąd: ${data.error}`) }
    else {
      setUsers(u => u.map(u => u.id === userId ? { ...u, email: editEmail.trim() } : u))
      setEditId(null)
    }
    setWorking(null)
  }

  async function resetPassword(email: string) {
    setWorking(email)
    const data = await callAdmin({ action: 'reset-password', email })
    if (data.error) alert(`Błąd: ${data.error}`)
    else alert(`Link do zmiany hasła wysłany na ${email}`)
    setWorking(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 max-w-5xl mx-auto">

      {/* Nagłówek */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 transition-colors">←</button>
        <h1 className="text-2xl font-bold">🛡 Panel Admina</h1>
        <button
          onClick={() => void loadUsers()}
          className="ml-auto text-sm text-gray-500 hover:text-gray-300 px-3 py-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          ↻ Odśwież
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700 text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-center py-16">Ładowanie użytkowników…</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-gray-500 text-sm mb-2">{users.length} użytkowników</p>

          {users.map(u => (
            <div key={u.id} className={`bg-gray-800/60 rounded-xl p-4 ${u.is_admin ? 'border border-blue-700/40' : ''}`}>
              <div className="flex items-start gap-4 flex-wrap">

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white truncate">{u.username}</span>
                    {u.is_admin && <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-full">admin</span>}
                  </div>

                  {/* Email – edytowalny */}
                  {editId === u.id ? (
                    <div className="flex gap-2 mt-1">
                      <input
                        type="email"
                        value={editEmail}
                        onChange={e => setEditEmail(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && void updateEmail(u.id)}
                        className="flex-1 px-3 py-1.5 bg-gray-900 border border-gray-600 text-white rounded-lg text-sm focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        onClick={() => void updateEmail(u.id)}
                        disabled={working === u.id}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50"
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg"
                      >
                        Anuluj
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditId(u.id); setEditEmail(u.email ?? '') }}
                      className="text-gray-400 text-sm hover:text-blue-300 transition-colors mt-0.5 text-left"
                      title="Kliknij żeby edytować email"
                    >
                      {u.email ?? '—'} ✏️
                    </button>
                  )}

                  <div className="text-gray-600 text-xs mt-1">
                    {u.total_points} pkt · {u.games_won}W/{u.games_played - u.games_won}L ·
                    zarejestrowany {new Date(u.created_at).toLocaleDateString('pl-PL')}
                  </div>
                </div>

                {/* Akcje */}
                <div className="flex gap-2 flex-wrap shrink-0">
                  <button
                    onClick={() => void resetPassword(u.email)}
                    disabled={working === u.email || !u.email}
                    className="px-3 py-1.5 bg-yellow-800/60 hover:bg-yellow-700/60 text-yellow-200 text-sm rounded-lg disabled:opacity-40 transition-colors"
                  >
                    📧 Reset hasła
                  </button>

                  {!u.is_admin && (
                    <button
                      onClick={() => void deleteUser(u.id, u.username)}
                      disabled={working === u.id}
                      className="px-3 py-1.5 bg-red-900/60 hover:bg-red-800/60 text-red-200 text-sm rounded-lg disabled:opacity-40 transition-colors"
                    >
                      🗑 Usuń
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
