import { useRef, useState, useEffect } from 'react'
import type { ChatMessage } from '../store/useChat'

interface Props {
  messages:    ChatMessage[]
  myId:        string
  myName:      string
  opponentName: string
  sending:     boolean
  onSend:      (text: string) => void
}

export function ChatBox({ messages, myId, myName, opponentName, sending, onSend }: Props) {
  const [open,  setOpen]  = useState(false)
  const [input, setInput] = useState('')
  const [unread, setUnread] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevLen   = useRef(messages.length)

  // Zlicz nieprzeczytane gdy czat zamknięty
  useEffect(() => {
    const newCount = messages.length - prevLen.current
    if (newCount > 0 && !open) setUnread(u => u + newCount)
    prevLen.current = messages.length
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, open])

  function handleOpen() { setOpen(true); setUnread(0) }

  function submit() {
    if (!input.trim()) return
    onSend(input)
    setInput('')
  }

  const getName = (id: string) => id === myId ? myName : opponentName

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {/* Panel czatu */}
      {open && (
        <div className="w-72 sm:w-80 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Nagłówek */}
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <span className="text-white text-sm font-semibold">💬 Czat</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
          </div>

          {/* Wiadomości */}
          <div className="flex-1 h-48 overflow-y-auto p-3 flex flex-col gap-1.5">
            {messages.length === 0 && (
              <p className="text-gray-600 text-xs text-center mt-4">Brak wiadomości. Napisz coś!</p>
            )}
            {messages.map(m => {
              const isMe = m.player_id === myId
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-gray-500 text-[10px] mb-0.5">{getName(m.player_id)}</span>
                  <div className={`px-3 py-1.5 rounded-xl text-sm max-w-[90%] break-words ${
                    isMe ? 'bg-blue-700 text-white' : 'bg-gray-700 text-gray-100'
                  }`}>
                    {m.text}
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2 p-2 border-t border-gray-700">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submit()}
              placeholder="Napisz…"
              maxLength={200}
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 text-white text-sm rounded-lg focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
            <button
              onClick={submit}
              disabled={sending || !input.trim()}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white text-sm rounded-lg transition-all"
            >
              ↑
            </button>
          </div>
        </div>
      )}

      {/* Przycisk otwierający */}
      <button
        onClick={handleOpen}
        className="relative w-12 h-12 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-full flex items-center justify-center shadow-lg transition-all"
      >
        <span className="text-xl">💬</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>
    </div>
  )
}
