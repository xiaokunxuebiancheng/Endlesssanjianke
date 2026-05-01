import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Edit3, Save, X, User, GraduationCap, Briefcase, MessageCircle, MapPin } from 'lucide-react'

const defaultDetails = {
  intro: '',
  school: '',
  work: '',
  wechat: '',
  location: '',
}

const fields = [
  { key: 'intro', label: '简介', icon: User, placeholder: '介绍一下你自己', type: 'textarea', rows: 3 },
  { key: 'school', label: '学校', icon: GraduationCap, placeholder: '毕业院校/专业', type: 'text' },
  { key: 'work', label: '工作经历', icon: Briefcase, placeholder: '公司/职位', type: 'textarea', rows: 2 },
  { key: 'wechat', label: '微信', icon: MessageCircle, placeholder: '微信号', type: 'text' },
  { key: 'location', label: '所在地', icon: MapPin, placeholder: '城市', type: 'text' },
]

export default function ProfileCard() {
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      await fetchProfile(u)
    })
  }, [])

  const fetchProfile = async (u) => {
    // Get the admin profile (1375937000@qq.com)
    const { data } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url, details')
      .eq('role', 'admin')
      .single()

    if (data) {
      setProfile(data)
      setForm({ ...defaultDetails, ...(data.details || {}) })
    }
    setLoading(false)
  }

  const isAdmin = user?.email === '1375937000@qq.com'

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({ details: form })
      .eq('id', profile.id)
    setProfile(p => ({ ...p, details: form }))
    setEditing(false)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="liquid-glass rounded-2xl p-6 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-20 mb-4" />
        <div className="space-y-3">
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-3/4" />
        </div>
      </div>
    )
  }

  if (!profile) return null

  const details = { ...defaultDetails, ...(editing ? form : profile.details) }

  return (
    <div className="liquid-glass rounded-2xl p-6 sticky top-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-medium flex items-center gap-2">
          <User size={16} />
          {profile.nickname || '个人信息'}
        </h3>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-colors">
            <Edit3 size={14} />
          </button>
        )}
        {editing && (
          <button onClick={() => { setEditing(false); setForm({ ...defaultDetails, ...(profile.details || {}) }) }}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-white/5 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-[10px] text-white/30 flex items-center gap-1 mb-1">
                <f.icon size={10} /> {f.label}
              </label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.key] || ''} rows={f.rows || 2}
                  onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg p-2.5 text-xs text-white placeholder:text-white/15 outline-none resize-none" />
              ) : (
                <input type="text" value={form[f.key] || ''}
                  onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-white/15 outline-none" />
              )}
            </div>
          ))}
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 disabled:opacity-50 transition-colors">
            <Save size={12} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {fields.map(f => {
            const val = details[f.key]
            if (!val) return null
            return (
              <div key={f.key} className="flex gap-2">
                <f.icon size={14} className="text-white/20 shrink-0 mt-0.5" />
                <p className="text-xs text-white/50 leading-relaxed whitespace-pre-wrap">{val}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
