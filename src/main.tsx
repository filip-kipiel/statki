import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { supabase } from './lib/supabase.ts'

// Test połączenia z Supabase – wynik widoczny w konsoli przeglądarki
supabase.from('games').select('*', { count: 'exact', head: true })
  .then(({ count, error }) => {
    if (error) console.error('[Supabase] Błąd połączenia:', error.message)
    else console.log(`[Supabase] Połączono ✓  tabela games: ${count} rekordów`)
  })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
