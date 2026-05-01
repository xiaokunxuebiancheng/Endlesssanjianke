import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Shield, MessageSquare, MessageCircle, Check, X, Loader2 } from 'lucide-react'

export default function Admin() {
  const [role, setRole] = useState(null)
  const [checking, setChecking] = useState(true)
  const [comments, setComments] = useState([])
  const [messages, setMessages] = useState([])
  const [tab, setTab] = useState('comments')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) { navigate('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        setRole('user')
        setChecking(false)
        return
      }

      setRole('admin')
      setChecking(false)
      fetchPending()
    })
  }, [])

  const fetchPending = () => {
    supabase
      .from('comments')
      .select('id, post_id, guest_name, content, created_at')
      .eq('is_approved', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => setComments(data ?? []))

    supabase
      .from('guestbook')
      .select('id, guest_name, content, created_at')
      .eq('is_approved', false)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data ?? []))
  }

  const handleApprove = async (table, id) => {
    await supabase.from(table).update({ is_approved: true }).eq('id', id)
    fetchPending()
  }

  const handleReject = async (table, id) => {
    await supabase.from(table).delete().eq('id', id)
    fetchPending()
  }

  if (checking) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={20} className="animate-spin text-white/40 mx-auto" />
      </div>
    )
  }

  if (role !== 'admin') {
    return (
      <div className="py-20 text-center">
        <Shield size={40} className="text-white/20 mx-auto mb-4" />
        <p className="text-white/40">无权访问此页面</p>
      </div>
    )
  }

  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold text-white mb-2">管理后台</h1>
      <p className="text-sm text-white/40 mb-8">审核评论和留言</p>

      {/* Tabs */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setTab('comments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
            tab === 'comments' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          <MessageCircle size={14} />
          评论审核
          {comments.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-400/20 text-red-400">
              {comments.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('messages')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-colors ${
            tab === 'messages' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'
          }`}
        >
          <MessageSquare size={14} />
          留言审核
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-red-400/20 text-red-400">
              {messages.length}
            </span>
          )}
        </button>
      </div>

      {/* Comments */}
      {tab === 'comments' && (
        <div className="space-y-3">
          {comments.length === 0 ? (
            <div className="liquid-glass rounded-2xl p-12 text-center text-white/30">
              暂无待审核评论
            </div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="liquid-glass rounded-2xl p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{c.guest_name || '匿名'}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(c.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-white/60">{c.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove('comments', c.id)}
                    className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
                    title="通过"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleReject('comments', c.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                    title="拒绝"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Guestbook Messages */}
      {tab === 'messages' && (
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="liquid-glass rounded-2xl p-12 text-center text-white/30">
              暂无待审核留言
            </div>
          ) : (
            messages.map(m => (
              <div key={m.id} className="liquid-glass rounded-2xl p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white">{m.guest_name || '匿名'}</span>
                    <span className="text-[10px] text-white/30">
                      {new Date(m.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <p className="text-sm text-white/60">{m.content}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleApprove('guestbook', m.id)}
                    className="p-2 rounded-lg text-green-400 hover:bg-green-400/10 transition-colors"
                    title="通过"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => handleReject('guestbook', m.id)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                    title="拒绝"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
