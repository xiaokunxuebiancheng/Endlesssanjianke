import { useState, useRef, useEffect, useCallback } from 'react'

const PROXY_URL = '/api/deepseek'

const STORAGE_KEY = 'ai_chat_messages'
const STORAGE_SIZE_KEY = 'ai_chat_size'
const STORAGE_POS_KEY = 'ai_chat_pos'
const SYSTEM_PROMPT = `You are a helpful, friendly, and knowledgeable AI assistant with real-time web search capability. When search results are provided in the conversation, use them to give accurate, up-to-date answers. If the user asks a time-sensitive question without enough detail (e.g. weather without a city), ask for the missing info — don't claim you can't access the internet. Reply in the same language the user writes in. Keep responses clear and concise.

Current date: ${new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}`

const MIN_W = 320
const MIN_H = 360
const DEFAULT_W = 384
const DEFAULT_H = 560

function loadMessages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveMessages(msgs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs))
  } catch { /* ignore */ }
}

function loadSaved(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return fallback
}

function saveJson(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch { /* ignore */ }
}

export default function ChatBubble() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState(loadMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const [size, setSize] = useState(() => loadSaved(STORAGE_SIZE_KEY, { width: DEFAULT_W, height: DEFAULT_H }))
  const [pos, setPos] = useState(() => loadSaved(STORAGE_POS_KEY, null))
  const dragRef = useRef(null)
  const posRef = useRef(pos)
  const sizeRef = useRef(size)
  const chatRef = useRef(null)

  // Keep refs in sync so event handlers always read latest values
  posRef.current = pos
  sizeRef.current = size

  function getDefaultPos() {
    return {
      left: Math.max(0, window.innerWidth - size.width - 24),
      top: Math.max(0, window.innerHeight - size.height - 96),
    }
  }

  const effectivePos = pos || getDefaultPos()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  // Drag & resize handlers — stable refs, no stale closure issues
  const handlersRef = useRef({ move: null, up: null })

  if (!handlersRef.current.move) {
    handlersRef.current.move = (e) => {
      if (!dragRef.current) return
      const { type, startX, startY, startLeft, startTop, startW, startH } = dragRef.current

      if (type === 'move') {
        const newPos = {
          left: Math.max(-100, Math.min(startLeft + e.clientX - startX, window.innerWidth - 100)),
          top: Math.max(0, Math.min(startTop + e.clientY - startY, window.innerHeight - 60)),
        }
        posRef.current = newPos
        setPos(newPos)
      } else if (type === 'resize') {
        const dw = startX - e.clientX
        const dh = startY - e.clientY
        const newW = Math.max(MIN_W, Math.min(startW + dw, window.innerWidth - 16))
        const newH = Math.max(MIN_H, Math.min(startH + dh, window.innerHeight - 16))
        const newPos = {
          left: Math.max(0, startLeft + (startW - newW)),
          top: Math.max(0, startTop + (startH - newH)),
        }
        const newSize = { width: newW, height: newH }
        posRef.current = newPos
        sizeRef.current = newSize
        setPos(newPos)
        setSize(newSize)
      }
    }

    handlersRef.current.up = () => {
      if (!dragRef.current) return
      saveJson(STORAGE_POS_KEY, posRef.current)
      saveJson(STORAGE_SIZE_KEY, sizeRef.current)
      dragRef.current = null
      document.removeEventListener('pointermove', handlersRef.current.move)
      document.removeEventListener('pointerup', handlersRef.current.up)
    }
  }

  const onPointerDown = useCallback((e, type) => {
    e.preventDefault()
    const rect = chatRef.current?.getBoundingClientRect()
    dragRef.current = {
      type,
      startX: e.clientX,
      startY: e.clientY,
      startLeft: rect?.left ?? effectivePos.left,
      startTop: rect?.top ?? effectivePos.top,
      startW: rect?.width ?? size.width,
      startH: rect?.height ?? size.height,
    }
    document.addEventListener('pointermove', handlersRef.current.move)
    document.addEventListener('pointerup', handlersRef.current.up)
  }, [effectivePos, size])

  useEffect(() => {
    return () => {
      document.removeEventListener('pointermove', handlersRef.current.move)
      document.removeEventListener('pointerup', handlersRef.current.up)
    }
  }, [])

  function persist(msgs) {
    setMessages(msgs)
    saveMessages(msgs)
  }

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return

    const userMsg = { role: 'user', content: text.trim() }
    const updated = [...messages, userMsg]
    persist(updated)
    setInput('')
    setLoading(true)
    setStreaming('')

    try {
      const payload = {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...updated.map(({ role, content }) => ({ role, content })),
        ],
        stream: true,
      }

      const res = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(`API error ${res.status}: ${err}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') continue

          try {
            const parsed = JSON.parse(data)
            const delta = parsed.choices?.[0]?.delta?.content
            if (delta) {
              fullContent += delta
              setStreaming(fullContent)
            }
          } catch { /* skip malformed JSON */ }
        }
      }

      if (fullContent) {
        persist([...updated, { role: 'assistant', content: fullContent }])
      }
      setStreaming('')
    } catch (err) {
      persist([...updated, { role: 'assistant', content: `❌ 出错了：${err.message}` }])
      setStreaming('')
    } finally {
      setLoading(false)
    }
  }, [messages, loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const clearChat = () => {
    persist([])
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500
                   text-white shadow-lg hover:shadow-xl transition-all duration-300 flex items-center
                   justify-center cursor-pointer"
        aria-label="AI 助手"
      >
        {open ? (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {open && (
        <div
          ref={chatRef}
          className="fixed z-50 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200
                     dark:border-gray-700 flex flex-col overflow-hidden"
          style={{
            left: effectivePos.left,
            top: effectivePos.top,
            width: size.width,
            height: size.height,
          }}
        >
          {/* Resize handle — top-left corner */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'resize')}
            className="absolute top-0 left-0 w-5 h-5 z-10 cursor-nwse-resize group"
            title="拖动调整大小"
          >
            <svg className="w-4 h-4 text-white/40 group-hover:text-white/80 absolute top-0.5 left-0.5 drop-shadow" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 8l-4 4m0 0l4 4m-4-4h16" />
            </svg>
          </div>

          {/* Header — drag handle */}
          <div
            onPointerDown={(e) => onPointerDown(e, 'move')}
            className="flex items-center justify-between px-4 py-3 border-b border-gray-200
                       dark:border-gray-700 bg-indigo-600 text-white shrink-0 cursor-move select-none"
          >
            <div className="flex items-center gap-2 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
                AI
              </div>
              <div>
                <div className="font-semibold text-sm">Lumina AI 助手</div>
                <div className="text-xs text-indigo-200">Powered by DeepSeek</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer"
                title="清除对话"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50 dark:bg-gray-950">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 dark:text-gray-500 mt-20">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">你好！我是 AI 助手，有什么可以帮你的？</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-md'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {streaming && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed
                                bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200
                                shadow-sm border border-gray-100 dark:border-gray-700">
                  {streaming}
                  <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse align-middle" />
                </div>
              </div>
            )}
            {loading && !streaming && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3
                                shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，Enter 发送..."
                rows={1}
                className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600
                           bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm
                           text-gray-800 dark:text-gray-200 placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-300
                           dark:disabled:bg-gray-700 text-white rounded-xl transition-colors
                           cursor-pointer disabled:cursor-not-allowed shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
