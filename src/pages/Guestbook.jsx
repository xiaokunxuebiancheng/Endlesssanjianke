import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Send, User, Mail } from 'lucide-react'

const PAGE_SIZE = 10

export default function Guestbook() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [user, setUser] = useState(null)

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
    const from = (page - 1) * PAGE_SIZE
    Promise.all([
      supabase
        .from('guestbook')
        .select('*', { count: 'exact', head: true })
        .eq('is_approved', true),
      supabase
        .from('guestbook')
        .select('id, content, guest_name, author_id, created_at')
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1),
    ]).then(([countRes, dataRes]) => {
      setTotal(countRes.count ?? 0)
      setMessages(dataRes.data ?? [])
      setLoading(false)
    })
  }, [page])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) return

    setSubmitting(true)
    setError('')

    const payload = user
      ? { content: form.content.trim(), author_id: user.id }
      : {
          content: form.content.trim(),
          guest_name: form.guest_name.trim() || '匿名',
          guest_email: form.guest_email.trim() || null,
        }

    const { error: err } = await supabase.from('guestbook').insert(payload)

    if (err) {
      setError('提交失败，请重试')
    } else {
      setSuccess(true)
      setForm({ guest_name: '', guest_email: '', content: '' })
    }
    setSubmitting(false)
  }

  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold text-white mb-2">留言板</h1>
      <p className="text-sm text-white/40 mb-10">留下你的足迹</p>

      {/* Form */}
      <form onSubmit={handleSubmit} className="liquid-glass rounded-2xl p-6 mb-10">
        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <User size={14} className="text-white/30 shrink-0" />
              <input
                type="text"
                placeholder="昵称（选填）"
                value={form.guest_name}
                onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06]">
              <Mail size={14} className="text-white/30 shrink-0" />
              <input
                type="email"
                placeholder="邮箱（选填）"
                value={form.guest_email}
                onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
              />
            </div>
          </div>
        )}
        <textarea
          placeholder="说点什么吧..."
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-sm text-white placeholder:text-white/20 outline-none resize-none"
          required
        />
        <div className="flex items-center justify-between mt-3">
          <button
            type="submit"
            disabled={submitting || !form.content.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <Send size={14} />
            {submitting ? '提交中...' : '发送留言'}
          </button>
          {error && <span className="text-xs text-red-400">{error}</span>}
          {success && <span className="text-xs text-green-400">留言已提交，审核后可见</span>}
        </div>
      </form>

      {/* Messages */}
      {loading ? (
        <div className="text-white/40 text-sm">加载中...</div>
      ) : messages.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center text-white/40">
          暂无留言，来当第一个吧
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className="liquid-glass rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-white">
                  {msg.guest_name || '匿名'}
                </span>
                <span className="text-[10px] text-white/30">
                  {new Date(msg.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
              <p className="text-sm text-white/70 leading-relaxed">{msg.content}</p>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                page === i + 1
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
