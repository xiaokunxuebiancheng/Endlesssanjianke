import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Send, User, Mail, Globe, CornerDownRight } from 'lucide-react'

const PAGE_SIZE = 5

export default function CommentSection({ postId }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [user, setUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [replyTo, setReplyTo] = useState(null)

  const [form, setForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_website: '',
    content: '',
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  useEffect(() => {
    if (!postId) return
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    Promise.all([
      supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId)
        .eq('is_approved', true),
      supabase
        .from('comments')
        .select('id, parent_id, author_id, guest_name, guest_website, content, like_count, created_at')
        .eq('post_id', postId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1),
    ]).then(([countRes, dataRes]) => {
      setTotal(countRes.count ?? 0)
      setComments(dataRes.data ?? [])
      setLoading(false)
    })
  }, [postId, page])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) return

    setSubmitting(true)
    const payload = {
      post_id: postId,
      content: form.content.trim(),
      parent_id: replyTo,
      ...(user
        ? { author_id: user.id }
        : {
            guest_name: form.guest_name.trim() || '匿名',
            guest_email: form.guest_email.trim() || null,
            guest_website: form.guest_website.trim() || null,
          }),
    }

    const { error } = await supabase.from('comments').insert(payload)

    if (!error) {
      setForm({ guest_name: '', guest_email: '', guest_website: '', content: '' })
      setReplyTo(null)
      // Refresh
      const from = (page - 1) * PAGE_SIZE
      const { data } = await supabase
        .from('comments')
        .select('id, parent_id, author_id, guest_name, guest_website, content, like_count, created_at')
        .eq('post_id', postId)
        .eq('is_approved', true)
        .order('created_at', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
      setComments(data ?? [])
    }
    setSubmitting(false)
  }

  // Group top-level and replies
  const topLevel = comments.filter(c => !c.parent_id)
  const replies = comments.filter(c => c.parent_id)
  const nested = topLevel.map(t => ({
    ...t,
    replies: replies.filter(r => r.parent_id === t.id),
  }))

  return (
    <div>
      <h3 className="text-lg font-medium text-white mb-6">
        评论 {total > 0 && <span className="text-white/30 text-sm">({total})</span>}
      </h3>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="liquid-glass rounded-2xl p-5 mb-8">
        {replyTo && (
          <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
            <CornerDownRight size={12} />
            回复评论
            <button type="button" onClick={() => setReplyTo(null)} className="text-white/60 hover:text-white">
              取消
            </button>
          </div>
        )}
        {!user && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <User size={12} className="text-white/30 shrink-0" />
              <input
                type="text"
                placeholder="昵称"
                value={form.guest_name}
                onChange={e => setForm(f => ({ ...f, guest_name: e.target.value }))}
                className="w-full bg-transparent text-xs text-white placeholder:text-white/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <Mail size={12} className="text-white/30 shrink-0" />
              <input
                type="email"
                placeholder="邮箱（选填）"
                value={form.guest_email}
                onChange={e => setForm(f => ({ ...f, guest_email: e.target.value }))}
                className="w-full bg-transparent text-xs text-white placeholder:text-white/20 outline-none"
              />
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <Globe size={12} className="text-white/30 shrink-0" />
              <input
                type="url"
                placeholder="网站（选填）"
                value={form.guest_website}
                onChange={e => setForm(f => ({ ...f, guest_website: e.target.value }))}
                className="w-full bg-transparent text-xs text-white placeholder:text-white/20 outline-none"
              />
            </div>
          </div>
        )}
        <textarea
          placeholder="写下你的评论..."
          value={form.content}
          onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-sm text-white placeholder:text-white/20 outline-none resize-none"
          required
        />
        <div className="flex justify-end mt-3">
          <button
            type="submit"
            disabled={submitting || !form.content.trim()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-xs hover:bg-white/20 disabled:opacity-30 transition-colors"
          >
            <Send size={12} />
            {submitting ? '提交中...' : '发表评论'}
          </button>
        </div>
      </form>

      {/* Comments List */}
      {loading ? (
        <div className="text-white/40 text-sm">加载中...</div>
      ) : nested.length === 0 ? (
        <div className="text-white/30 text-sm py-8 text-center">暂无评论，来说两句吧</div>
      ) : (
        <div className="space-y-4">
          {nested.map(comment => (
            <div key={comment.id}>
              <div className="liquid-glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-white">
                    {comment.guest_name || '匿名'}
                  </span>
                  <span className="text-[10px] text-white/30">
                    {new Date(comment.created_at).toLocaleDateString('zh-CN')}
                  </span>
                  {comment.guest_website && (
                    <a href={comment.guest_website} target="_blank" rel="noopener noreferrer" className="text-white/20 hover:text-white/50">
                      <Globe size={10} />
                    </a>
                  )}
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{comment.content}</p>
                <button
                  onClick={() => setReplyTo(comment.id)}
                  className="text-[10px] text-white/30 hover:text-white/60 mt-2 transition-colors"
                >
                  回复
                </button>
              </div>
              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-6 mt-2 space-y-2 border-l border-white/[0.06] pl-4">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="liquid-glass rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-white">
                          {reply.guest_name || '匿名'}
                        </span>
                        <span className="text-[10px] text-white/30">
                          {new Date(reply.created_at).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                      <p className="text-xs text-white/60 leading-relaxed">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
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
