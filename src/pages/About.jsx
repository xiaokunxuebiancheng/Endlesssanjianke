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

export default function About() {
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
      const { data: p } = await supabase
        .from('profiles')
        .select('id, nickname, avatar_url, details')
        .eq('role', 'admin')
        .single()
      if (p) {
        setProfile(p)
        setForm({ ...defaultDetails, ...(p.details || {}) })
      }
      setLoading(false)
    })
  }, [])

  const isAdmin = user?.email === '1375937000@qq.com'

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({ details: form }).eq('id', profile.id)
    setProfile(p => ({ ...p, details: form }))
    setEditing(false)
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-white/40">加载中...</div>
    )
  }

  if (!profile) return null

  const details = { ...defaultDetails, ...(editing ? form : profile.details) }
  const hasContent = fields.some(f => details[f.key])

  return (
    <div className="py-12 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">关于我</h1>
        {isAdmin && !editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors">
            <Edit3 size={14} /> 编辑
          </button>
        )}
        {editing && (
          <button onClick={() => { setEditing(false); setForm({ ...defaultDetails, ...(profile.details || {}) }) }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white/40 text-sm hover:text-red-400 transition-colors">
            <X size={14} /> 取消
          </button>
        )}
      </div>

      {editing ? (
        <div className="liquid-glass rounded-2xl p-6 space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="text-xs text-white/30 flex items-center gap-1.5 mb-1.5">
                <f.icon size={12} /> {f.label}
              </label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.key] || ''} rows={f.rows || 2}
                  onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl p-3 text-sm text-white placeholder:text-white/15 outline-none resize-none" />
              ) : (
                <input type="text" value={form[f.key] || ''}
                  onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-white placeholder:text-white/15 outline-none" />
              )}
            </div>
          ))}
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50 transition-colors">
            <Save size={14} />
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      ) : hasContent ? (
        <div className="liquid-glass rounded-2xl p-6 space-y-5">
          {fields.map(f => {
            const val = details[f.key]
            if (!val) return null
            return (
              <div key={f.key} className="flex gap-3">
                <f.icon size={18} className="text-white/20 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] text-white/20 mb-0.5">{f.label}</p>
                  <p className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{val}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="liquid-glass rounded-2xl p-12 text-center text-white/30">
          还没有填写个人信息
          {isAdmin && <p className="text-xs mt-2">点击右上角"编辑"开始填写</p>}
        </div>
      )}
    </div>
  )
}
