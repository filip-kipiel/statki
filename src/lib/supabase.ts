import { createClient } from '@supabase/supabase-js'

// .trim() usuwa znak nowej linii który może się wkraść w zmiennych Vercel
const url  = (import.meta.env.VITE_SUPABASE_URL  as string).trim()
const key  = (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim()

export const supabase = createClient(url, key)
