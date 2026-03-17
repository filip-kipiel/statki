// Czat w grze – Supabase Realtime

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface ChatMessage {
  id: string
  player_id: string
  text: string
  created_at: string
}

export function useChat(gameId: string, myId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending,  setSending]  = useState(false)

  // Załaduj historię i subskrybuj nowe wiadomości
  useEffect(() => {
    // Historyczne wiadomości
    void supabase
      .from('messages')
      .select('id, player_id, text, created_at')
      .eq('game_id', gameId)
      .order('created_at')
      .then(({ data }) => { if (data) setMessages(data as ChatMessage[]) })

    // Realtime – nowe wiadomości
    const ch = supabase
      .channel(`chat-${gameId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `game_id=eq.${gameId}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new as ChatMessage])
      })
      .subscribe()

    return () => { void supabase.removeChannel(ch) }
  }, [gameId])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    await supabase.from('messages').insert({ game_id: gameId, player_id: myId, text: trimmed })
    setSending(false)
  }

  return { messages, sending, sendMessage, myId }
}
