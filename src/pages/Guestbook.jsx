import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Send, User, Mail, CornerDownRight, X } from 'lucide-react'

const PAGE_SIZE = 10
const MAX_LENGTH = 2000

function stripHtml(str) {
  return str.replace(/<[^>]*>/g, '')
}

export default function Guestbook() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)
  const [replyTo, setReplyTo] = useState(null)
  const honeypotRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  const [form, setForm] = useState({
    guest_name: '',
    guest_email: '',
    content: '',
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchMessages()
  }, [page])

  const fetchMessages = async () => {
    const from = (page - 1) * PAGE_SIZE
    const [{ count }, { data }] = await Promise.all([
      supabase
        .from('guestbook')
        .select('*', { count: 'exact', head: true })
        .is('parent_id', null),
      supabase
        .from('guestbook')
        .select('id, parent_id, content, guest_name, author_id, created_at')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1),
    ])

    if (data && data.length > 0) {
      const parentIds = data.map(m => m.id)
      const { data: replies } = await supabase
        .from('guestbook')
        .select('id, parent_id, content, guest_name, author_id, created_at')
        .in('parent_id', parentIds)
        .order('created_at', { ascending: true })

      const replyMap = {}
      if (replies) replies.forEach(r => {
        if (!replyMap[r.parent_id]) replyMap[r.parent_id] = []
        replyMap[r.parent_id].push(r)
      })
      setMessages(data.map(m => ({ ...m, replies: replyMap[m.id] || [] })))
    } else {
      setMessages([])
    }
    setTotal(count ?? 0)
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess(false)
    setError('')

    if (honeypotRef.current?.value) return
    if (Date.now() - startTimeRef.current < 2000) {
      setError('操作太快，请稍后再试')
      return
    }

    const cleanContent = stripHtml(form.content.trim())
    if (!cleanContent) return
    if (cleanContent.length > MAX_LENGTH) {
      setError(`内容不能超过${MAX_LENGTH}字`)
      return
    }

    setSubmitting(true)

    const payload = {
      content: cleanContent,
      is_approved: true,
      parent_id: replyTo,
      ...(user
        ? { author_id: user.id }
        : {
            guest_name: stripHtml(form.guest_name.trim()) || '匿名',
            guest_email: form.guest_email.trim() || null,
          }),
    }

    const { error: err } = await supabase.from('guestbook').insert(payload)

    if (err) {
      if (err.message?.includes('频繁')) {
        setError('操作太频繁，请30秒后再试')
      } else if (err.message?.includes('violates check constraint')) {
        setError('内容包含非法字符或超长')
      } else {
        setError('提交失败，请重试')
      }
    } else {
      setSuccess(true)
      setForm({ guest_name: '', guest_email: '', content: '' })
      setReplyTo(null)
      startTimeRef.current = Date.now()
      fetchMessages()
    }
    setSubmitting(false)
  }

  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">留言板</h1>
      <p className="text-sm text-gray-500 mb-10">留下你的足迹</p>

      {/* Main form */}
      <form onSubmit={handleSubmit} className="liquid-glass rounded-2xl p-6 mb-10">
        <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off"
          style={{ position: 'absolute', left: '-9999px', opacity: 0 }} aria-hidden="true" />

        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
            <CornerDownRight size={12} />
            回复中
            <button type="button" onClick={() => setReplyTo(null)} className="text-gray-600 hover:text-gray-900 ml-1">
              <X size={12} />
            </button>
          </div>
        )}

        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.03] border border-black/[0.06]">
              <User size={14} className="text-gray-400 shrink-0" />
              <input type="text" placeholder="昵称（选填）" value={form.guest_name} maxLength={50}
                onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-300 outline-none" />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/[0.03] border border-black/[0.06]">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <input type="email" placeholder="邮箱（选填）" value={form.guest_email} maxLength={200}
                onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))}
                className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-300 outline-none" />
            </div>
          </div>
        )}

        <textarea placeholder={replyTo ? "写下你的回复..." : "说点什么吧..."} value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))} rows={3} maxLength={MAX_LENGTH}
          className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl p-4 text-sm text-gray-900 placeholder:text-gray-300 outline-none resize-none"
          required />

        <div className="flex items-center justify-between mt-3">
          <button type="submit" disabled={submitting || !form.content.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-black/5 text-gray-700 text-sm hover:bg-black/10 disabled:opacity-30 transition-colors">
            <Send size={14} />
            {submitting ? '提交中...' : '发送'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-300">{form.content.length}/{MAX_LENGTH}</span>
            {error && <span className="text-xs text-red-500">{error}</span>}
            {success && <span className="text-xs text-green-600">发送成功</span>}
          </div>
        </div>
      </form>

      {/* Messages */}
      {loading ? (
        <div className="text-gray-400 text-sm">加载中...</div>
      ) : messages.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center text-gray-400">
          暂无留言，来当第一个吧
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id}>
              <MessageBubble msg={msg} onReply={id => { setReplyTo(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />

              {msg.replies.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l border-black/[0.08] pl-4">
                  {msg.replies.map(reply => (
                    <MessageBubble key={reply.id} msg={reply} isReply onReply={id => { setReplyTo(id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-black/10 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors">
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 text-xs rounded-lg transition-colors ${page === i + 1 ? 'bg-black/5 text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}>
              {i + 1}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-black/10 text-gray-500 hover:text-gray-900 disabled:opacity-30 transition-colors">
            下一页
          </button>
        </div>
      )}
    </div>
  )
}

function MessageBubble({ msg, isReply, onReply }) {
  return (
    <div className="liquid-glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className={`font-medium text-gray-900 ${isReply ? 'text-xs' : 'text-sm'}`}>
          {msg.guest_name || '匿名'}
        </span>
        <span className="text-[10px] text-gray-400">
          {new Date(msg.created_at).toLocaleDateString('zh-CN')}
        </span>
      </div>
      <p className={`text-gray-700 leading-relaxed ${isReply ? 'text-xs' : 'text-sm'}`}>
        {msg.content}
      </p>
      {!isReply && (
        <button onClick={() => onReply(msg.id)}
          className="text-[10px] text-gray-400 hover:text-gray-700 mt-1.5 transition-colors">
          回复
        </button>
      )}
    </div>
  )
}
