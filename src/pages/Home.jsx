import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MessageSquare, Edit3, Check } from 'lucide-react'

const DEFAULT_WELCOME = '欢迎来到我的个人空间'

export default function Home() {
  const [welcome, setWelcome] = useState(DEFAULT_WELCOME)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user
      setIsAdmin(u?.email === '1375937000@qq.com')

      const { data: p } = await supabase
        .from('profiles')
        .select('details')
        .eq('role', 'admin')
        .single()
      if (p?.details?.welcome) {
        setWelcome(p.details.welcome)
      }
    })
  }, [])

  const handleEdit = () => {
    setEditText(welcome)
    setEditing(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const text = editText.trim() || DEFAULT_WELCOME
    // Get profile id first
    const { data: p } = await supabase
      .from('profiles')
      .select('id, details')
      .eq('role', 'admin')
      .single()
    if (p) {
      const details = { ...(p.details || {}), welcome: text }
      await supabase.from('profiles').update({ details }).eq('id', p.id)
    }
    setWelcome(text)
    setEditing(false)
    setSaving(false)
  }

  return (
    <div className="py-20 flex flex-col items-center justify-center text-center min-h-[60vh]">
      {editing ? (
        <div className="mb-12 w-full max-w-lg">
          <textarea
            value={editText}
            onChange={e => setEditText(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 text-center text-2xl md:text-3xl font-bold text-white placeholder:text-white/20 outline-none resize-none"
            autoFocus
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-3 flex items-center gap-1.5 mx-auto px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50 transition-colors"
          >
            <Check size={14} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      ) : (
        <div className="relative mb-12 max-w-xl group">
          <h1 className="text-3xl md:text-4xl font-bold text-white leading-relaxed whitespace-pre-wrap">
            {welcome}
          </h1>
          {isAdmin && (
            <button
              onClick={handleEdit}
              className="absolute -right-8 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white/20 hover:text-white/70 transition-colors opacity-0 group-hover:opacity-100"
              title="编辑"
            >
              <Edit3 size={14} />
            </button>
          )}
        </div>
      )}

      <Link
        to="/guestbook"
        className="liquid-glass rounded-2xl px-8 py-4 flex items-center gap-3 text-white hover:bg-white/[0.06] transition-colors"
      >
        <MessageSquare size={20} />
        <div className="text-left">
          <div className="text-sm font-medium">留言板</div>
          <div className="text-[10px] text-white/30">留下你的足迹</div>
        </div>
      </Link>
    </div>
  )
}
