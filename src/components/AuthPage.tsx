import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface Props {
  onAuth: (userId: string, username: string) => void
}

export function AuthPage({ onAuth }: Props) {
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [confirm, setConfirm]   = useState(false)

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password) {
      setError('Wypełnij wszystkie pola'); return
    }
    if (password.length < 6) {
      setError('Hasło musi mieć co najmniej 6 znaków'); return
    }
    setLoading(true); setError(null)

    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { username: username.trim() } },
    })

    if (err) { setError(err.message); setLoading(false); return }

    // Jeśli email confirmation wyłączony – sesja od razu
    if (data.session) {
      onAuth(data.user!.id, username.trim())
    } else {
      // Włączone potwierdzenie – poczekaj na mail
      setConfirm(true)
    }
    setLoading(false)
  }

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Wypełnij email i hasło'); return
    }
    setLoading(true); setError(null)

    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(), password,
    })

    if (err) {
      if (err.message.includes('Email not confirmed')) {
        setError('Potwierdź swój email – sprawdź skrzynkę i kliknij link aktywacyjny')
      } else {
        setError('Błędny email lub hasło')
      }
      setLoading(false); return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', data.user.id)
      .single()

    onAuth(data.user.id, profile?.username ?? data.user.email ?? 'Gracz')
    setLoading(false)
  }

  function switchMode(m: 'login' | 'register') {
    setMode(m); setError(null); setConfirm(false)
  }

  if (confirm) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center flex flex-col gap-4">
          <div className="text-5xl">📧</div>
          <h2 className="text-xl font-bold text-white">Sprawdź skrzynkę!</h2>
          <p className="text-gray-400 text-sm">
            Wysłaliśmy link aktywacyjny na <strong className="text-white">{email}</strong>.
            Kliknij go, a potem zaloguj się.
          </p>
          <button
            onClick={() => switchMode('login')}
            className="mt-2 w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
          >
            Przejdź do logowania
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm flex flex-col gap-6">

        {/* Logo */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-wide">⚓ Statki</h1>
          <p className="text-gray-500 text-sm mt-1">Multiplayer</p>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-800 rounded-xl p-1">
          {(['login', 'register'] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === m ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Zaloguj się' : 'Zarejestruj'}
            </button>
          ))}
        </div>

        {/* Formularz */}
        <div className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Nazwa gracza (widoczna w rankingu)"
              maxLength={20}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
          )}
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Hasło (min. 6 znaków)"
            onKeyDown={e => e.key === 'Enter' && (mode === 'login' ? void handleLogin() : void handleRegister())}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-500"
          />
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-900/40 border border-red-700 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={mode === 'login' ? () => void handleLogin() : () => void handleRegister()}
          disabled={loading}
          className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold text-lg rounded-xl transition-all"
        >
          {loading ? '…' : mode === 'login' ? 'ZALOGUJ SIĘ' : 'ZAREJESTRUJ'}
        </button>
      </div>
    </div>
  )
}
