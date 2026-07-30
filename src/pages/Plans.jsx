import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase'
import { ChevronDown, Plus, Trash2, Save } from 'lucide-react'

// ====== helpers ======

function getDefaultMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(key) {
  const [y, m] = key.split('-')
  return `${y}年${parseInt(m)}月`
}

function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number)
  return { year: y, month: m }
}

function shiftMonth(key, delta) {
  const { year, month } = parseMonthKey(key)
  let m = month + delta
  let y = year
  if (m > 12) { m = 1; y++ }
  if (m < 1) { m = 12; y-- }
  return `${y}-${String(m).padStart(2, '0')}`
}

function computeWeekRanges(key) {
  const { year, month } = parseMonthKey(key)
  const daysInMonth = new Date(year, month, 0).getDate()
  const starts = daysInMonth <= 28 ? [1, 8, 15, 22] : [1, 8, 15, 22, 29]
  const ranges = starts.map((s, i) => {
    const end = i < starts.length - 1 ? starts[i + 1] - 1 : daysInMonth
    return { start: `${month}/${s}`, end: `${month}/${end}` }
  })
  while (ranges.length < 5) ranges.push({ start: '', end: '' })
  return ranges
}

let uid = 0
function genId() { return 'i_' + (++uid) + '_' + Math.random().toString(36).slice(2, 6) }

// ====== constants ======

const WEEK_NAMES = ['第一周', '第二周', '第三周', '第四周', '第五周']

const DEFAULT_DATA = {
  goals: [
    { id: 'g1', description: '', keyResult: '', weight: '' },
    { id: 'g2', description: '', keyResult: '', weight: '' },
    { id: 'g3', description: '', keyResult: '', weight: '' },
  ],
  weeks: WEEK_NAMES.map(() => ({
    tasks: [
      { id: 't1', priority: 'P1', content: '', owner: '', deadline: '', status: '未开始' },
      { id: 't2', priority: 'P1', content: '', owner: '', deadline: '', status: '未开始' },
      { id: 't3', priority: 'P1', content: '', owner: '', deadline: '', status: '未开始' },
      { id: 't4', priority: 'P1', content: '', owner: '', deadline: '', status: '未开始' },
    ],
    review: { done: '', improve: '', next: '' },
  })),
  other: [
    { id: 'o1', emoji: '📋', label: '待办 / 备忘', value: '' },
    { id: 'o2', emoji: '⚠️', label: '风险 / 依赖', value: '' },
    { id: 'o3', emoji: '📚', label: '学习 / 成长', value: '' },
    { id: 'o4', emoji: '📝', label: '备注', value: '' },
  ],
  summary: [
    { id: 's1', emoji: '✅', label: '本月已完成', value: '' },
    { id: 's2', emoji: '❌', label: '未完成及原因', value: '' },
    { id: 's3', emoji: '💡', label: '经验与改进', value: '' },
    { id: 's4', emoji: '🎯', label: '下月重点方向', value: '' },
  ],
}

// ====== dark theme shared classes ======

const inputCls = 'w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-white/15 outline-none hover:bg-white/[0.06] focus:border-white/20 focus:bg-white/[0.06] transition-colors'
const textareaCls = inputCls + ' resize-none'
const selectCls = 'bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-sm text-white/80 outline-none cursor-pointer hover:bg-white/[0.06] transition-colors'

function statusSelectCls(status) {
  const base = 'border rounded-lg px-2 py-1.5 text-sm outline-none cursor-pointer transition-colors'
  switch (status) {
    case '已完成':
      return base + ' bg-emerald-500/15 border-emerald-400/30 text-emerald-300'
    case '进行中':
      return base + ' bg-amber-500/15 border-amber-400/30 text-amber-300'
    case '暂停':
      return base + ' bg-red-500/10 border-red-400/20 text-red-300'
    default:
      return base + ' bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.06]'
  }
}
const btnAddCls = 'inline-flex items-center gap-1 px-3 py-1.5 mt-2 bg-white/[0.04] text-white/50 border border-dashed border-white/[0.10] rounded-lg text-xs cursor-pointer hover:bg-white/[0.08] hover:text-white/80 hover:border-white/20 transition-colors'
const btnDelCls = 'w-6 h-6 border-none bg-transparent text-red-400 text-lg cursor-pointer rounded flex items-center justify-center hover:bg-red-400/10 hover:text-red-300 transition-colors'
const thCls = 'text-left text-[11px] font-medium text-white/30 py-2 px-1'
const tableBorder = 'border-b border-white/[0.06]'

// ====== Section: Monthly Goals ======

function GoalsSection({ goals, onChange }) {
  const update = (id, field, val) => onChange(goals.map(g => g.id === id ? { ...g, [field]: val } : g))
  const remove = (id) => onChange(goals.filter(g => g.id !== id))
  const add = () => onChange([...goals, { id: genId(), description: '', keyResult: '', weight: '' }])

  return (
    <div>
      <table className="w-full" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className={tableBorder}>
            <th className={thCls + ' w-8'}>#</th>
            <th className={thCls + ' w-[40%]'}>目标描述</th>
            <th className={thCls + ' w-[40%]'}>关键结果</th>
            <th className={thCls + ' w-[70px]'}>权重</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {goals.map((g, i) => (
            <tr key={g.id} className={tableBorder}>
              <td className="text-center text-sm text-white/40 py-1.5">{i + 1}</td>
              <td className="py-1.5 px-1">
                <textarea className={textareaCls} placeholder="描述本月核心目标..." value={g.description} onChange={e => update(g.id, 'description', e.target.value)} rows={1} />
              </td>
              <td className="py-1.5 px-1">
                <textarea className={textareaCls} placeholder="可量化的关键结果..." value={g.keyResult} onChange={e => update(g.id, 'keyResult', e.target.value)} rows={1} />
              </td>
              <td className="py-1.5 px-1">
                <input className={inputCls} placeholder="如 30%" value={g.weight} onChange={e => update(g.id, 'weight', e.target.value)} />
              </td>
              <td className="text-center py-1.5">
                <button className={btnDelCls} onClick={() => remove(g.id)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={btnAddCls} onClick={add}><Plus size={12} /> 添加目标</button>
    </div>
  )
}

// ====== Section: Weekly Plans ======

function WeeksSection({ weeks, weekRanges, onChange }) {
  const updateTask = (wi, tid, field, val) => {
    const next = weeks.map((w, i) => {
      if (i !== wi) return w
      return { ...w, tasks: w.tasks.map(t => t.id === tid ? { ...t, [field]: val } : t) }
    })
    onChange(next)
  }
  const removeTask = (wi, tid) => {
    onChange(weeks.map((w, i) => i !== wi ? w : { ...w, tasks: w.tasks.filter(t => t.id !== tid) }))
  }
  const addTask = (wi) => {
    onChange(weeks.map((w, i) => i !== wi ? w : {
      ...w,
      tasks: [...w.tasks, { id: genId(), priority: 'P1', content: '', owner: '', deadline: weekRanges[wi]?.end || '', status: '未开始' }]
    }))
  }
  const updateReview = (wi, field, val) => {
    onChange(weeks.map((w, i) => i !== wi ? w : { ...w, review: { ...w.review, [field]: val } }))
  }

  return (
    <div className="space-y-4">
      {WEEK_NAMES.map((name, wi) => {
        const week = weeks[wi] || { tasks: [], review: { done: '', improve: '', next: '' } }
        const range = weekRanges[wi] || { start: '', end: '' }
        const rangeStr = range.start ? `${range.start} — ${range.end}` : ''

        return (
          <div key={wi} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3 text-sm text-white/80">
              <span className="w-2 h-2 rounded-full bg-white/40 inline-block" />
              <span className="font-medium">{name}</span>
              {rangeStr && <span className="text-xs text-white/25">({rangeStr})</span>}
            </div>

            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className={tableBorder}>
                  <th className={thCls + ' w-[70px]'}>优先级</th>
                  <th className={thCls}>任务内容</th>
                  <th className={thCls + ' w-[80px]'}>负责人</th>
                  <th className={thCls + ' w-[90px]'}>截止日</th>
                  <th className={thCls + ' w-[95px]'}>状态</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {week.tasks.map(t => (
                  <tr key={t.id} className={tableBorder}>
                    <td className="py-1.5 px-1">
                      <select className={selectCls} value={t.priority} onChange={e => updateTask(wi, t.id, 'priority', e.target.value)}>
                        <option value="P0">P0</option>
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-1">
                      <textarea className={textareaCls} placeholder="任务描述..." value={t.content} onChange={e => updateTask(wi, t.id, 'content', e.target.value)} rows={1} />
                    </td>
                    <td className="py-1.5 px-1">
                      <input className={inputCls} placeholder="负责人" value={t.owner} onChange={e => updateTask(wi, t.id, 'owner', e.target.value)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <input className={inputCls} value={t.deadline} onChange={e => updateTask(wi, t.id, 'deadline', e.target.value)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <select className={statusSelectCls(t.status)} value={t.status} onChange={e => updateTask(wi, t.id, 'status', e.target.value)}
                        style={{ background: t.status === '已完成' ? 'rgba(16,185,129,0.15)' : t.status === '进行中' ? 'rgba(245,158,11,0.15)' : t.status === '暂停' ? 'rgba(239,68,68,0.1)' : 'rgba(30,30,40,0.95)' }}>
                        <option value="未开始" style={{ background: '#1e1e28', color: '#999' }}>未开始</option>
                        <option value="进行中" style={{ background: '#1e1e28', color: '#f59e0b' }}>进行中</option>
                        <option value="已完成" style={{ background: '#1e1e28', color: '#10b981' }}>已完成</option>
                        <option value="暂停" style={{ background: '#1e1e28', color: '#ef4444' }}>暂停</option>
                      </select>
                    </td>
                    <td className="text-center py-1.5">
                      <button className={btnDelCls} onClick={() => removeTask(wi, t.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={btnAddCls} onClick={() => addTask(wi)}><Plus size={12} /> 添加任务</button>

            {/* Week review */}
            <div className="grid grid-cols-3 gap-3 mt-3 bg-white/[0.02] rounded-xl p-3 border border-white/[0.04]">
              {[
                { key: 'done', icon: '📊', label: '完成情况', ph: '本周完成情况...' },
                { key: 'improve', icon: '🔧', label: '待改进', ph: '需要改进的地方...' },
                { key: 'next', icon: '👉', label: '下周重点', ph: '下周重点关注...' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-[11px] text-white/30 block mb-1">{f.icon} {f.label}</label>
                  <textarea className={textareaCls + ' min-h-[55px]'} placeholder={f.ph} value={week.review[f.key]} onChange={e => updateReview(wi, f.key, e.target.value)} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ====== Section: Dynamic items (Other / Summary) ======

function DynamicSection({ items, onChange }) {
  const update = (id, field, val) => onChange(items.map(it => it.id === id ? { ...it, [field]: val } : it))
  const remove = (id) => onChange(items.filter(it => it.id !== id))
  const add = (emoji = '📋', label = '') => onChange([...items, { id: genId(), emoji, label, value: '' }])

  return (
    <div className="space-y-3">
      {items.map(it => (
        <div key={it.id} className="flex gap-2 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-sm">{it.emoji}</span>
              <input className={inputCls + ' !w-auto !min-w-[140px] font-medium'} value={it.label} onChange={e => update(it.id, 'label', e.target.value)} placeholder="标签名..." />
            </div>
            <textarea className={textareaCls + ' min-h-[60px]'} placeholder="内容..." value={it.value} onChange={e => update(it.id, 'value', e.target.value)} />
          </div>
          <button className={btnDelCls + ' mt-7'} onClick={() => remove(it.id)}>×</button>
        </div>
      ))}
      <button className={btnAddCls} onClick={() => add()}><Plus size={12} /> 添加条目</button>
    </div>
  )
}

// ====== Card wrapper ======

function Card({ badge, title, children, collapsed, onToggle }) {
  return (
    <div className="liquid-glass rounded-2xl overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-4 cursor-pointer select-none hover:bg-white/[0.02] transition-colors"
        onClick={onToggle}
        style={collapsed ? {} : { borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="bg-white/15 text-white/90 text-xs px-2.5 py-0.5 rounded-full font-medium">{badge}</span>
        <span className="text-base font-semibold text-white/85">{title}</span>
        <span className="ml-auto text-white/20 transition-transform" style={{ transform: collapsed ? 'rotate(-90deg)' : 'none' }}>
          <ChevronDown size={16} />
        </span>
      </div>
      {!collapsed && (
        <div className="px-5 py-4">
          {children}
        </div>
      )}
    </div>
  )
}

// ====== Main Page ======

export default function Plans() {
  const [monthKey, setMonthKey] = useState(getDefaultMonthKey)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saveStatus, setSaveStatus] = useState('')
  const [collapsedCards, setCollapsedCards] = useState({})
  const saveTimer = useRef(null)
  const dataRef = useRef(null)

  const weekRanges = computeWeekRanges(monthKey)

  const fetchData = useCallback(async (key) => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setData(null); setLoading(false); return }

    const { data: row } = await supabase
      .from('monthly_plan_data')
      .select('data')
      .eq('user_id', session.user.id)
      .eq('month_key', key)
      .single()

    if (row?.data) {
      const merged = { ...DEFAULT_DATA, ...row.data }
      if (!merged.goals) merged.goals = DEFAULT_DATA.goals
      merged.weeks = WEEK_NAMES.map((_, i) => {
        const saved = (row.data.weeks && row.data.weeks[i]) || {}
        const def = DEFAULT_DATA.weeks[i]
        return { tasks: saved.tasks || def.tasks, review: saved.review || def.review }
      })
      if (!merged.other) merged.other = DEFAULT_DATA.other
      if (!merged.summary) merged.summary = DEFAULT_DATA.summary
      setData(merged)
    } else {
      setData(JSON.parse(JSON.stringify(DEFAULT_DATA)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(monthKey)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [monthKey])

  // Core save function — writes to Supabase immediately
  const performSave = useCallback(async (dataToSave) => {
    if (!dataToSave) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return false
      await supabase.from('monthly_plan_data').upsert({
        user_id: session.user.id,
        month_key: monthKey,
        data: dataToSave,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,month_key' })
      const now = new Date()
      setSaveStatus(`已保存 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`)
      return true
    } catch (err) {
      console.error('Save error:', err)
      setSaveStatus('保存失败')
      return false
    }
  }, [monthKey])

  // Save on page unload with keepalive (async won't work in beforeunload)
  useEffect(() => {
    const doKeepaliveSave = () => {
      const toSave = dataRef.current
      if (!toSave) return
      const url = `${supabaseUrl}/rest/v1/monthly_plan_data`
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!session?.user) return
        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${session.access_token}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            user_id: session.user.id,
            month_key: monthKey,
            data: toSave,
            updated_at: new Date().toISOString(),
          }),
          keepalive: true,
        })
      })
    }

    const handleVisibility = () => {
      if (document.hidden) { if (saveTimer.current) clearTimeout(saveTimer.current); performSave(dataRef.current) }
    }
    window.addEventListener('beforeunload', doKeepaliveSave)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('beforeunload', doKeepaliveSave)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [monthKey, performSave])

  const debouncedSave = useCallback((newData) => {
    dataRef.current = newData
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('保存中...')
    saveTimer.current = setTimeout(() => performSave(dataRef.current), 1000)
  }, [performSave])

  const updateData = useCallback((newData) => {
    setData(newData)
    debouncedSave(newData)
  }, [debouncedSave])

  const updateSection = (section, value) => {
    if (!data) return
    updateData({ ...data, [section]: value })
  }

  const handleMonthSwitch = async (delta) => {
    if (saveTimer.current) { clearTimeout(saveTimer.current) }
    const toSave = dataRef.current || data
    if (toSave) {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await supabase.from('monthly_plan_data').upsert({
            user_id: session.user.id, month_key: monthKey, data: toSave,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,month_key' })
        }
      } catch (e) { /* ignore */ }
    }
    setMonthKey(shiftMonth(monthKey, delta))
  }

  const toggleCard = (id) => setCollapsedCards(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="py-10">
      {/* Header */}
      <div className="liquid-glass rounded-2xl px-5 py-3.5 mb-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📅</span>
          <button onClick={() => handleMonthSwitch(-1)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs cursor-pointer hover:bg-white/[0.10] hover:text-white/80 transition-colors flex items-center justify-center"
          >◀</button>
          <span className="text-lg font-semibold text-white">{formatMonthLabel(monthKey)}</span>
          <button onClick={() => handleMonthSwitch(1)}
            className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/50 text-xs cursor-pointer hover:bg-white/[0.10] hover:text-white/80 transition-colors flex items-center justify-center"
          >▶</button>
          <span className="text-sm text-white/30">月度计划</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] text-white/25">{saveStatus || '已保存'}</span>
          <button
            onClick={() => { if (saveTimer.current) clearTimeout(saveTimer.current); performSave(data) }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
          >
            <Save size={14} />保存
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-white/30 text-sm text-center py-20">加载中...</div>
      ) : !data ? (
        <div className="liquid-glass rounded-3xl p-20 text-center">
          <span className="text-4xl block mb-4 opacity-30">📅</span>
          <p className="text-white/30 text-sm">请先登录后查看计划</p>
        </div>
      ) : (
        <div className="space-y-5">
          <Card badge="1" title="本月主题 / 核心目标" collapsed={collapsedCards['goals']} onToggle={() => toggleCard('goals')}>
            <GoalsSection goals={data.goals} onChange={v => updateSection('goals', v)} />
          </Card>

          <Card badge="2" title="周度计划" collapsed={collapsedCards['weeks']} onToggle={() => toggleCard('weeks')}>
            <WeeksSection weeks={data.weeks} weekRanges={weekRanges} onChange={v => updateSection('weeks', v)} />
          </Card>

          <Card badge="3" title="其他事项" collapsed={collapsedCards['other']} onToggle={() => toggleCard('other')}>
            <DynamicSection items={data.other} onChange={v => updateSection('other', v)} />
          </Card>

          <Card badge="4" title="月末总结" collapsed={collapsedCards['summary']} onToggle={() => toggleCard('summary')}>
            <DynamicSection items={data.summary} onChange={v => updateSection('summary', v)} />
          </Card>
        </div>
      )}
    </div>
  )
}
