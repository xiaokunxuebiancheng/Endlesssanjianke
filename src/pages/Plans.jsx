import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { ChevronDown, ChevronRight, Plus, Trash2, Save, Download } from 'lucide-react'

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

// ====== default data ======

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
  reading: [
    { id: 'r1', title: '', author: '', status: '已读完', rating: '', notes: '' },
  ],
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

// ====== styles (inline, matching the template's clean white-card aesthetic) ======

const S = {
  input: 'w-full bg-transparent border border-transparent rounded px-2 py-1 text-sm outline-none hover:bg-black/[0.02] focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(3,102,214,0.1)] transition-colors',
  textarea: 'w-full bg-transparent border border-transparent rounded px-2 py-1 text-sm outline-none hover:bg-black/[0.02] focus:border-blue-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(3,102,214,0.1)] transition-colors resize-none',
  select: 'bg-white border border-gray-200 rounded px-2 py-0.5 text-sm outline-none cursor-pointer',
  btnDel: 'w-6 h-6 border-none bg-transparent text-red-500 text-lg cursor-pointer rounded flex items-center justify-center hover:bg-red-50',
  btnAdd: 'inline-flex items-center gap-1 px-3 py-1.5 mt-2 bg-white text-blue-500 border border-dashed border-blue-400 rounded text-xs cursor-pointer hover:bg-blue-50 hover:border-solid transition-colors',
}

// ====== Section: Monthly Goals ======

function GoalsSection({ goals, onChange }) {
  const update = (id, field, val) => {
    onChange(goals.map(g => g.id === id ? { ...g, [field]: val } : g))
  }
  const remove = (id) => onChange(goals.filter(g => g.id !== id))
  const add = () => onChange([...goals, { id: genId(), description: '', keyResult: '', weight: '' }])

  return (
    <div>
      <table className="w-full" style={{ tableLayout: 'fixed' }}>
        <thead>
          <tr className="border-b-2 border-gray-200">
            <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-8">#</th>
            <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-[40%]">目标描述</th>
            <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-[40%]">关键结果</th>
            <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-[70px]">权重</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {goals.map((g, i) => (
            <tr key={g.id} className="border-b border-gray-100">
              <td className="text-center text-sm font-semibold text-gray-700 py-1.5">{i + 1}</td>
              <td className="py-1.5 px-1">
                <textarea className={S.textarea} placeholder="描述本月核心目标..." value={g.description} onChange={e => update(g.id, 'description', e.target.value)} rows={1} />
              </td>
              <td className="py-1.5 px-1">
                <textarea className={S.textarea} placeholder="可量化的关键结果..." value={g.keyResult} onChange={e => update(g.id, 'keyResult', e.target.value)} rows={1} />
              </td>
              <td className="py-1.5 px-1">
                <input className={S.input} placeholder="如 30%" value={g.weight} onChange={e => update(g.id, 'weight', e.target.value)} />
              </td>
              <td className="text-center py-1.5">
                <button className={S.btnDel} onClick={() => remove(g.id)}>×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button className={S.btnAdd} onClick={add}>＋ 添加目标</button>
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
    const next = weeks.map((w, i) => {
      if (i !== wi) return w
      return { ...w, tasks: w.tasks.filter(t => t.id !== tid) }
    })
    onChange(next)
  }
  const addTask = (wi) => {
    const next = weeks.map((w, i) => {
      if (i !== wi) return w
      return { ...w, tasks: [...w.tasks, { id: genId(), priority: 'P1', content: '', owner: '', deadline: weekRanges[wi]?.end || '', status: '未开始' }] }
    })
    onChange(next)
  }
  const updateReview = (wi, field, val) => {
    const next = weeks.map((w, i) => {
      if (i !== wi) return w
      return { ...w, review: { ...w.review, [field]: val } }
    })
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {WEEK_NAMES.map((name, wi) => {
        const week = weeks[wi] || { tasks: [], review: { done: '', improve: '', next: '' } }
        const range = weekRanges[wi] || { start: '', end: '' }
        const rangeStr = range.start ? `${range.start} — ${range.end}` : ''

        return (
          <div key={wi} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3 font-semibold text-sm text-gray-800">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
              {name}
              {rangeStr && <span className="text-xs text-gray-400 font-normal">({rangeStr})</span>}
            </div>

            {/* Task table */}
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-[70px]">优先级</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 px-1">任务内容</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-[90px]">负责人</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-[95px]">截止日</th>
                  <th className="text-left text-xs font-medium text-gray-500 py-2 px-1 w-[100px]">状态</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {week.tasks.map(t => (
                  <tr key={t.id} className="border-b border-gray-100">
                    <td className="py-1.5 px-1">
                      <select className={S.select} value={t.priority} onChange={e => updateTask(wi, t.id, 'priority', e.target.value)}>
                        <option value="P0">P0</option>
                        <option value="P1">P1</option>
                        <option value="P2">P2</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-1">
                      <textarea className={S.textarea} placeholder="任务描述..." value={t.content} onChange={e => updateTask(wi, t.id, 'content', e.target.value)} rows={1} />
                    </td>
                    <td className="py-1.5 px-1">
                      <input className={S.input} placeholder="负责人" value={t.owner} onChange={e => updateTask(wi, t.id, 'owner', e.target.value)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <input className={S.input} value={t.deadline} onChange={e => updateTask(wi, t.id, 'deadline', e.target.value)} />
                    </td>
                    <td className="py-1.5 px-1">
                      <select className={S.select} value={t.status} onChange={e => updateTask(wi, t.id, 'status', e.target.value)}>
                        <option value="未开始">⬜ 未开始</option>
                        <option value="进行中">🔄 进行中</option>
                        <option value="已完成">✅ 已完成</option>
                        <option value="暂停">⏸️ 暂停</option>
                      </select>
                    </td>
                    <td className="text-center py-1.5">
                      <button className={S.btnDel} onClick={() => removeTask(wi, t.id)}>×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button className={S.btnAdd} onClick={() => addTask(wi)}>＋ 添加任务</button>

            {/* Week review */}
            <div className="grid grid-cols-3 gap-3 mt-3 bg-gray-50 rounded-lg p-3">
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">📊 完成情况</label>
                <textarea className={S.textarea + ' min-h-[60px]'} placeholder="本周完成情况..." value={week.review.done} onChange={e => updateReview(wi, 'done', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">🔧 待改进</label>
                <textarea className={S.textarea + ' min-h-[60px]'} placeholder="需要改进的地方..." value={week.review.improve} onChange={e => updateReview(wi, 'improve', e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] font-medium text-gray-500 block mb-1">👉 下周重点</label>
                <textarea className={S.textarea + ' min-h-[60px]'} placeholder="下周重点关注..." value={week.review.next} onChange={e => updateReview(wi, 'next', e.target.value)} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ====== Section: Reading Notes (inline in the plan) ======

function ReadingSection({ entries, onChange }) {
  const update = (id, field, val) => {
    onChange(entries.map(e => e.id === id ? { ...e, [field]: val } : e))
  }
  const remove = (id) => onChange(entries.filter(e => e.id !== id))
  const add = () => onChange([...entries, { id: genId(), title: '', author: '', status: '已读完', rating: '', notes: '' }])

  return (
    <div className="space-y-3">
      {entries.map(e => (
        <div key={e.id} className="border border-gray-200 rounded-lg p-4 relative">
          <button className="absolute top-2 right-2 w-6 h-6 text-red-500 text-lg cursor-pointer rounded flex items-center justify-center hover:bg-red-50" onClick={() => remove(e.id)}>×</button>
          <div className="flex gap-3 mb-3 flex-wrap">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[11px] font-medium text-gray-500 block mb-0.5">📖 书名</label>
              <input className={S.input} placeholder="书名..." value={e.title} onChange={ev => update(e.id, 'title', ev.target.value)} />
            </div>
            <div className="flex-1 min-w-[100px]">
              <label className="text-[11px] font-medium text-gray-500 block mb-0.5">✍️ 作者</label>
              <input className={S.input} placeholder="作者..." value={e.author} onChange={ev => update(e.id, 'author', ev.target.value)} />
            </div>
            <div className="w-[100px]">
              <label className="text-[11px] font-medium text-gray-500 block mb-0.5">进度</label>
              <select className={S.select + ' w-full'} value={e.status} onChange={ev => update(e.id, 'status', ev.target.value)}>
                <option value="想读">📚 想读</option>
                <option value="在读">📖 在读</option>
                <option value="已读完">✅ 已读完</option>
              </select>
            </div>
            <div className="w-[90px]">
              <label className="text-[11px] font-medium text-gray-500 block mb-0.5">评分</label>
              <select className={S.select + ' w-full'} value={e.rating} onChange={ev => update(e.id, 'rating', ev.target.value)}>
                <option value="">-</option>
                <option value="⭐">⭐</option>
                <option value="⭐⭐">⭐⭐</option>
                <option value="⭐⭐⭐">⭐⭐⭐</option>
                <option value="⭐⭐⭐⭐">⭐⭐⭐⭐</option>
                <option value="⭐⭐⭐⭐⭐">⭐⭐⭐⭐⭐</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-medium text-gray-500 block mb-0.5">📝 笔记 / 摘录 / 读后感</label>
            <textarea className={S.textarea + ' min-h-[80px]'} placeholder="记录你的读书笔记、金句摘录、读后感悟..." value={e.notes} onChange={ev => update(e.id, 'notes', ev.target.value)} />
          </div>
        </div>
      ))}
      <button className={S.btnAdd} onClick={add}>＋ 添加书籍</button>
    </div>
  )
}

// ====== Section: Dynamic items (Other / Summary) ======

function DynamicSection({ items, onChange }) {
  const update = (id, field, val) => {
    onChange(items.map(it => it.id === id ? { ...it, [field]: val } : it))
  }
  const remove = (id) => onChange(items.filter(it => it.id !== id))
  const add = (emoji = '📋', label = '') => onChange([...items, { id: genId(), emoji, label, value: '' }])

  return (
    <div className="space-y-3">
      {items.map(it => (
        <div key={it.id} className="flex gap-2 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1 text-sm font-semibold text-gray-700">
              <span>{it.emoji}</span>
              <input className={S.input + ' !w-auto !min-w-[120px] font-semibold'} value={it.label} onChange={e => update(it.id, 'label', e.target.value)} placeholder="标签名..." />
            </div>
            <textarea className={S.textarea + ' min-h-[60px]'} placeholder="内容..." value={it.value} onChange={e => update(it.id, 'value', e.target.value)} />
          </div>
          <button className={S.btnDel + ' mt-6'} onClick={() => remove(it.id)}>×</button>
        </div>
      ))}
      <button className={S.btnAdd} onClick={() => add()}>＋ 添加条目</button>
    </div>
  )
}

// ====== Card wrapper ======

function Card({ badge, title, children, collapsed, onToggle }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-2 px-6 py-4 cursor-pointer select-none hover:bg-gray-50 transition-colors"
        onClick={onToggle}
        style={collapsed ? {} : { borderBottom: '2px solid #0366d6' }}
      >
        <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">{badge}</span>
        <span className="text-base font-semibold text-gray-900">{title}</span>
        <span className="ml-auto text-gray-400 text-sm transition-transform" style={{ transform: collapsed ? 'rotate(-90deg)' : 'none' }}>
          <ChevronDown size={16} />
        </span>
      </div>
      {!collapsed && (
        <div className="px-6 py-5">
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
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState('')
  const [collapsedCards, setCollapsedCards] = useState({})
  const saveTimer = useRef(null)
  const dataRef = useRef(null)

  const weekRanges = computeWeekRanges(monthKey)

  // Fetch data for current month
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
      // Ensure all arrays exist
      if (!merged.goals) merged.goals = DEFAULT_DATA.goals
      merged.weeks = WEEK_NAMES.map((_, i) => {
        const saved = (row.data.weeks && row.data.weeks[i]) || {}
        const def = DEFAULT_DATA.weeks[i]
        return {
          tasks: saved.tasks || def.tasks,
          review: saved.review || def.review,
        }
      })
      if (!merged.reading) merged.reading = DEFAULT_DATA.reading
      if (!merged.other) merged.other = DEFAULT_DATA.other
      if (!merged.summary) merged.summary = DEFAULT_DATA.summary
      setData(merged)
    } else {
      setData(JSON.parse(JSON.stringify(DEFAULT_DATA))) // deep clone
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData(monthKey)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [monthKey])

  // Auto-save with debounce
  const debouncedSave = useCallback((newData) => {
    dataRef.current = newData
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveStatus('💾 保存中...')
    saveTimer.current = setTimeout(async () => {
      const toSave = dataRef.current
      if (!toSave) return
      setSaving(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) return

        // Upsert: try insert, if conflict update
        await supabase.from('monthly_plan_data').upsert({
          user_id: session.user.id,
          month_key: monthKey,
          data: toSave,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,month_key' })

        const now = new Date()
        const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
        setSaveStatus(`💾 已保存 ${time}`)
      } catch (err) {
        console.error('Save error:', err)
        setSaveStatus('⚠️ 保存失败')
      }
      setSaving(false)
    }, 1000)
  }, [monthKey])

  const updateData = useCallback((newData) => {
    setData(newData)
    debouncedSave(newData)
  }, [debouncedSave])

  const updateSection = (section, value) => {
    if (!data) return
    const next = { ...data, [section]: value }
    updateData(next)
  }

  const handleMonthSwitch = async (delta) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current)
      // Force save current data before switching
      const toSave = dataRef.current || data
      if (toSave) {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            await supabase.from('monthly_plan_data').upsert({
              user_id: session.user.id,
              month_key: monthKey,
              data: toSave,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,month_key' })
          }
        } catch (e) { /* ignore */ }
      }
    }
    setMonthKey(shiftMonth(monthKey, delta))
  }

  const toggleCard = (id) => {
    setCollapsedCards(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="py-8" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif' }}>
      {/* ===== Header ===== */}
      <div className="bg-white border border-gray-200 rounded-lg px-6 py-4 mb-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="text-xl">📅</span>
          <button
            onClick={() => handleMonthSwitch(-1)}
            className="w-7 h-7 border border-gray-200 rounded bg-white text-gray-500 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-500 hover:border-blue-400 flex items-center justify-center"
          >◀</button>
          <span className="text-lg font-semibold text-blue-500">{formatMonthLabel(monthKey)}</span>
          <button
            onClick={() => handleMonthSwitch(1)}
            className="w-7 h-7 border border-gray-200 rounded bg-white text-gray-500 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-500 hover:border-blue-400 flex items-center justify-center"
          >▶</button>
          <span className="text-sm text-gray-500">月度计划</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{saveStatus || '💾 已保存'}</span>
          <button
            onClick={() => { if (saveTimer.current) { clearTimeout(saveTimer.current) }; debouncedSave(data) }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors font-medium"
          >
            <Save size={14} />保存
          </button>
        </div>
      </div>

      {/* ===== Content ===== */}
      {loading ? (
        <div className="text-gray-400 text-sm text-center py-20">加载中...</div>
      ) : !data ? (
        <div className="bg-white border border-gray-200 rounded-lg p-20 text-center">
          <span className="text-4xl block mb-4">📅</span>
          <p className="text-gray-400 text-sm">请先登录</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* 1. Goals */}
          <Card badge="1" title="本月主题 / 核心目标" collapsed={collapsedCards['goals']} onToggle={() => toggleCard('goals')}>
            <GoalsSection goals={data.goals} onChange={v => updateSection('goals', v)} />
          </Card>

          {/* 2. Weeks */}
          <Card badge="2" title="周度计划" collapsed={collapsedCards['weeks']} onToggle={() => toggleCard('weeks')}>
            <WeeksSection weeks={data.weeks} weekRanges={weekRanges} onChange={v => updateSection('weeks', v)} />
          </Card>

          {/* 3. Reading */}
          <Card badge="3" title="读书笔记" collapsed={collapsedCards['reading']} onToggle={() => toggleCard('reading')}>
            <ReadingSection entries={data.reading} onChange={v => updateSection('reading', v)} />
          </Card>

          {/* 4. Other */}
          <Card badge="4" title="其他事项" collapsed={collapsedCards['other']} onToggle={() => toggleCard('other')}>
            <DynamicSection items={data.other} onChange={v => updateSection('other', v)} />
          </Card>

          {/* 5. Summary */}
          <Card badge="5" title="月末总结" collapsed={collapsedCards['summary']} onToggle={() => toggleCard('summary')}>
            <DynamicSection items={data.summary} onChange={v => updateSection('summary', v)} />
          </Card>
        </div>
      )}
    </div>
  )
}
