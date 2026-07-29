import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, ChevronRight, ChevronDown, Calendar, Tag, Trash2, Edit3,
  Target, Layers, ListTodo, Clock, CheckCircle2,
  Circle, X, GripVertical,
} from 'lucide-react'

const STATUS_CONFIG = {
  not_started: { label: '未开始', icon: Circle, color: 'text-white/35' },
  in_progress: { label: '进行中', icon: Clock, color: 'text-blue-400' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-400' },
  cancelled: { label: '已取消', icon: X, color: 'text-white/20' },
}

const PRIORITY_CONFIG = {
  low: { label: '低', bg: 'bg-slate-400/15 text-slate-300' },
  medium: { label: '中', bg: 'bg-blue-400/15 text-blue-300' },
  high: { label: '高', bg: 'bg-orange-400/15 text-orange-300' },
  urgent: { label: '紧急', bg: 'bg-red-400/15 text-red-300' },
}

const TYPE_LABELS = { monthly: '月度目标', weekly: '周计划', daily: '日待办' }
const TYPE_ICONS = { monthly: Target, weekly: Layers, daily: ListTodo }

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isOverdue(dueDate) {
  if (!dueDate) return false
  return new Date(dueDate) < new Date(new Date().toDateString())
}

export default function Plans() {
  const [plans, setPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedMonths, setExpandedMonths] = useState({})
  const [expandedWeeks, setExpandedWeeks] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [viewMode, setViewMode] = useState('hierarchy')

  const fetchPlans = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { setPlans([]); setLoading(false); return }
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const toggleMonth = (id) => {
    setExpandedMonths(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleWeek = (id) => {
    setExpandedWeeks(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const childrenOf = (parentId) =>
    plans.filter(p => p.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at))

  const topLevelMonths = () =>
    plans.filter(p => p.plan_type === 'monthly' && !p.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at))

  const standaloneWeeks = () =>
    plans.filter(p => p.plan_type === 'weekly' && !p.parent_id)

  const standaloneDailies = () =>
    plans.filter(p => p.plan_type === 'daily' && !p.parent_id)

  const cycleStatus = async (plan) => {
    const order = ['not_started', 'in_progress', 'completed']
    const idx = order.indexOf(plan.status)
    const next = idx < order.length - 1 ? order[idx + 1] : order[0]
    await supabase.from('plans').update({ status: next }).eq('id', plan.id)
    fetchPlans()
  }

  const deletePlan = async (id) => {
    if (!confirm('确定要删除此计划及其所有子计划吗？')) return
    await supabase.from('plans').delete().eq('id', id)
    fetchPlans()
  }

  const openCreate = (parentId = null, planType = 'monthly') => {
    setEditingPlan({ parent_id: parentId, plan_type: planType })
    setShowForm(true)
  }

  const openEdit = (plan) => {
    setEditingPlan(plan)
    setShowForm(true)
  }

  const filterByStatus = (list) => {
    if (filterStatus === 'all') return list
    return list.filter(p => p.status === filterStatus)
  }

  // ===== Sub-components =====

  const StatusBtn = ({ plan, size = 14 }) => {
    const SIcon = STATUS_CONFIG[plan.status].icon
    return (
      <button
        onClick={(e) => { e.stopPropagation(); cycleStatus(plan) }}
        className="shrink-0 text-white/40 hover:text-white transition-colors"
        title={STATUS_CONFIG[plan.status].label}
      >
        <SIcon size={size} className={STATUS_CONFIG[plan.status].color} />
      </button>
    )
  }

  const PriorityBadge = ({ priority }) => {
    const p = PRIORITY_CONFIG[priority]
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.bg}`}>{p.label}</span>
  }

  const TagsRow = ({ tags }) => {
    if (!tags || tags.length === 0) return null
    return tags.slice(0, 3).map(tag => (
      <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 flex items-center gap-1">
        <Tag size={8} />{tag}
      </span>
    ))
  }

  const DueDate = ({ date, status }) => {
    if (!date) return null
    const overdue = isOverdue(date) && status !== 'completed' && status !== 'cancelled'
    return (
      <span className={`flex items-center gap-1 text-[10px] ${overdue ? 'text-red-400' : 'text-white/25'}`}>
        <Calendar size={10} />
        {formatDate(date)}
        {overdue && <span className="text-red-400/80">逾期</span>}
      </span>
    )
  }

  const ActionBtns = ({ plan, showAddChild = false }) => (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
      {showAddChild && plan.plan_type === 'monthly' && (
        <button
          onClick={(e) => { e.stopPropagation(); openCreate(plan.id, 'weekly') }}
          className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="添加周计划"
        >
          <Plus size={14} />
        </button>
      )}
      {showAddChild && plan.plan_type === 'weekly' && (
        <button
          onClick={(e) => { e.stopPropagation(); openCreate(plan.id, 'daily') }}
          className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
          title="添加日待办"
        >
          <Plus size={14} />
        </button>
      )}
      <button
        onClick={(e) => { e.stopPropagation(); openEdit(plan) }}
        className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
        title="编辑"
      >
        <Edit3 size={13} />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); deletePlan(plan.id) }}
        className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors"
        title="删除"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )

  // Daily todo item (simple row)
  const DailyRow = ({ plan }) => {
    const overdue = isOverdue(plan.due_date) && plan.status !== 'completed' && plan.status !== 'cancelled'
    return (
      <div className={`group flex items-center gap-2.5 px-3 py-2 rounded-lg ml-8 transition-colors hover:bg-white/[0.03] cursor-pointer
        ${plan.status === 'completed' ? 'opacity-50' : ''}
        ${plan.status === 'cancelled' ? 'opacity-30 line-through' : ''}
      `} onClick={() => openEdit(plan)}>
        <StatusBtn plan={plan} size={12} />
        <span className={`flex-1 text-xs ${plan.status === 'completed' ? 'text-white/30' : 'text-white/70'} truncate`}>
          {plan.title}
        </span>
        <PriorityBadge priority={plan.priority} />
        <DueDate date={plan.due_date} status={plan.status} />
        <TagsRow tags={plan.tags} />
        <ActionBtns plan={plan} />
      </div>
    )
  }

  // Week plan row (within a month card)
  const WeekRow = ({ plan, monthStatus }) => {
    const dailies = childrenOf(plan.id)
    const isExpanded = expandedWeeks[plan.id] ?? true
    const completedCount = dailies.filter(d => d.status === 'completed').length
    const totalCount = dailies.filter(d => d.status !== 'cancelled').length
    const weekOverdue = isOverdue(plan.due_date) && plan.status !== 'completed' && plan.status !== 'cancelled'

    return (
      <div className="select-none">
        <div
          className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-lg ml-4 transition-colors cursor-pointer
            ${plan.status === 'completed' ? 'opacity-50' : ''}
            ${plan.status === 'cancelled' ? 'opacity-30 line-through' : ''}
            hover:bg-white/[0.04]
          `}
          onClick={() => openEdit(plan)}
        >
          {/* Expand toggle for dailies */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleWeek(plan.id) }}
            className="p-0.5 text-white/20 hover:text-white/50 transition-colors shrink-0"
          >
            {dailies.length > 0 ? (
              isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
            ) : (
              <span className="w-3 block" />
            )}
          </button>

          <StatusBtn plan={plan} size={13} />

          <Layers size={12} className="text-white/25 shrink-0" />

          <span className={`flex-1 text-sm ${plan.status === 'completed' ? 'text-white/35' : 'text-white/80'} truncate`}>
            {plan.title}
          </span>

          {/* Week progress */}
          {totalCount > 0 && (
            <span className="text-[10px] text-white/25">
              {completedCount}/{totalCount}
            </span>
          )}

          <PriorityBadge priority={plan.priority} />
          {weekOverdue && <span className="text-[10px] text-red-400/80">逾期</span>}
          <DueDate date={plan.due_date} status={plan.status} />
          <TagsRow tags={plan.tags} />

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); openCreate(plan.id, 'daily') }}
              className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              title="添加日待办"
            >
              <Plus size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(plan) }}
              className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            >
              <Edit3 size={12} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deletePlan(plan.id) }}
              className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Expanded dailies */}
        {dailies.length > 0 && isExpanded && (
          <div className="ml-4 mt-0.5 border-l border-white/[0.04] pl-4">
            {filterByStatus(dailies).map(d => (
              <DailyRow key={d.id} plan={d} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Monthly goal card
  const MonthCard = ({ plan }) => {
    const weeks = childrenOf(plan.id)
    const isExpanded = expandedMonths[plan.id] ?? true
    const totalWeeks = weeks.filter(w => w.status !== 'cancelled').length
    const completedWeeks = weeks.filter(w => w.status === 'completed').length
    const monthOverdue = isOverdue(plan.due_date) && plan.status !== 'completed' && plan.status !== 'cancelled'

    return (
      <div className="liquid-glass rounded-2xl overflow-hidden">
        {/* Month header */}
        <div
          className={`group flex items-center gap-3 px-5 py-4 cursor-pointer transition-colors hover:bg-white/[0.02]
            ${plan.status === 'completed' ? 'opacity-60' : ''}
            ${plan.status === 'cancelled' ? 'opacity-40' : ''}
          `}
          onClick={() => openEdit(plan)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); toggleMonth(plan.id) }}
            className="p-0.5 text-white/25 hover:text-white/60 transition-colors shrink-0"
          >
            {weeks.length > 0 ? (
              isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
            ) : (
              <span className="w-4 block" />
            )}
          </button>

          <StatusBtn plan={plan} size={16} />

          <Target size={16} className="text-white/30 shrink-0" />

          <div className="flex-1 min-w-0" onClick={() => openEdit(plan)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-base font-semibold ${plan.status === 'completed' ? 'text-white/35' : 'text-white'} ${plan.status === 'cancelled' ? 'line-through' : ''}`}>
                {plan.title}
              </span>
              <PriorityBadge priority={plan.priority} />
              {monthOverdue && <span className="text-[10px] text-red-400/80 font-medium">逾期</span>}
              {totalWeeks > 0 && (
                <span className="text-[10px] text-white/25">
                  ({completedWeeks}/{totalWeeks} 周完成)
                </span>
              )}
            </div>
            {plan.description && (
              <p className="text-xs text-white/30 mt-1 line-clamp-1">{plan.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-white/25">
              <DueDate date={plan.due_date} status={plan.status} />
              <span className="flex items-center gap-1">
                <Clock size={10} />{formatDate(plan.created_at)}
              </span>
              <TagsRow tags={plan.tags} />
            </div>
          </div>

          {/* Month actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); openCreate(plan.id, 'weekly') }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white/30 hover:text-white/70 bg-white/[0.04] hover:bg-white/[0.08] text-xs transition-colors"
              title="添加周计划"
            >
              <Plus size={12} />周计划
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); openEdit(plan) }}
              className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
            >
              <Edit3 size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); deletePlan(plan.id) }}
              className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Week progress bar */}
        {totalWeeks > 0 && (
          <div className="px-5 pb-1">
            <div className="h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div
                className="h-full bg-white/20 rounded-full transition-all duration-500"
                style={{ width: `${(completedWeeks / totalWeeks) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Weeks list */}
        {weeks.length > 0 && isExpanded && (
          <div className="px-2 pb-2 pt-1 border-t border-white/[0.03] mt-1">
            {filterByStatus(weeks).map(week => (
              <WeekRow key={week.id} plan={week} monthStatus={plan.status} />
            ))}
          </div>
        )}

        {/* Empty state when expanded but no weeks */}
        {weeks.length === 0 && isExpanded && (
          <div className="px-5 pb-4 border-t border-white/[0.03] pt-3">
            <button
              onClick={() => openCreate(plan.id, 'weekly')}
              className="w-full py-3 rounded-xl border border-dashed border-white/[0.06] text-white/25 text-xs hover:text-white/50 hover:border-white/[0.12] transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus size={12} />
              添加周计划
            </button>
          </div>
        )}
      </div>
    )
  }

  // ===== Main render =====

  const months = topLevelMonths()
  const orphanWeeks = standaloneWeeks()
  const orphanDailies = standaloneDailies()

  return (
    <div className="py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-white/60" />
          <h1 className="text-3xl font-bold text-white">计划管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/60 outline-none cursor-pointer"
          >
            <option value="all">全部状态</option>
            <option value="not_started">未开始</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="cancelled">已取消</option>
          </select>
          <button
            onClick={() => openCreate(null, 'monthly')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
          >
            <Plus size={16} />
            新建月度目标
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-white/40 text-sm text-center py-20">加载中...</div>
      ) : plans.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-20 text-center">
          <Target size={40} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-4">还没有任何计划</p>
          <button
            onClick={() => openCreate(null, 'monthly')}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
          >
            <Plus size={16} />
            创建第一个月度目标
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Monthly goals with their weeks and dailies */}
          {filterByStatus(months).map(month => (
            <MonthCard key={month.id} plan={month} />
          ))}

          {/* Orphan weeks (not under any month) */}
          {orphanWeeks.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-white/30 mb-2 flex items-center gap-2">
                <Layers size={14} /> 未归属的周计划
              </h2>
              <div className="liquid-glass rounded-2xl p-2 space-y-0.5">
                {filterByStatus(orphanWeeks).map(week => (
                  <WeekRow key={week.id} plan={week} />
                ))}
              </div>
            </section>
          )}

          {/* Orphan dailies */}
          {orphanDailies.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-white/30 mb-2 flex items-center gap-2">
                <ListTodo size={14} /> 未归属的日待办
              </h2>
              <div className="liquid-glass rounded-2xl p-2 space-y-0.5">
                {filterByStatus(orphanDailies).map(d => (
                  <DailyRow key={d.id} plan={d} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && <PlanFormModal plan={editingPlan} onClose={() => { setShowForm(false); setEditingPlan(null) }} onSaved={fetchPlans} plans={plans} />}
    </div>
  )
}

// ===== Form Modal =====

function PlanFormModal({ plan, onClose, onSaved, plans }) {
  const isEdit = !!plan?.id
  const [title, setTitle] = useState(plan?.title || '')
  const [description, setDescription] = useState(plan?.description || '')
  const [planType, setPlanType] = useState(plan?.plan_type || 'monthly')
  const [priority, setPriority] = useState(plan?.priority || 'medium')
  const [dueDate, setDueDate] = useState(plan?.due_date || '')
  const [status, setStatus] = useState(plan?.status || 'not_started')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState(plan?.tags || [])
  const [parentId, setParentId] = useState(plan?.parent_id || null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const availableParents = plans.filter(p =>
    p.id !== plan?.id &&
    ((planType === 'weekly' && p.plan_type === 'monthly') ||
     (planType === 'daily' && p.plan_type === 'weekly'))
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        setError('请先登录后再操作')
        setSaving(false)
        return
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        plan_type: planType,
        priority,
        due_date: dueDate || null,
        status,
        tags,
        parent_id: parentId,
        sort_order: 0,
        user_id: session.user.id,
      }

      if (isEdit) {
        const { error: updateErr } = await supabase.from('plans').update(payload).eq('id', plan.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('plans').insert(payload)
        if (insertErr) throw insertErr
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || '保存失败，请重试')
      setSaving(false)
    }
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) setTags([...tags, t])
    setTagInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg liquid-glass rounded-2xl p-6 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-white">
            {isEdit ? '编辑计划' : '新建计划'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">标题</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="计划标题..."
              maxLength={200}
              autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs text-white/40 mb-1.5 block">描述</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="详细描述..."
              rows={3}
              maxLength={1000}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-white/20 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">类型</label>
              <select
                value={planType}
                onChange={e => { setPlanType(e.target.value); setParentId(null) }}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer"
              >
                <option value="monthly">月度目标</option>
                <option value="weekly">周计划</option>
                <option value="daily">日待办</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">优先级</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">状态</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer"
              >
                <option value="not_started">未开始</option>
                <option value="in_progress">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">截止日期</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {planType !== 'monthly' && availableParents.length > 0 && (
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">
                所属{planType === 'weekly' ? '月度目标' : '周计划'}
              </label>
              <select
                value={parentId || ''}
                onChange={e => setParentId(e.target.value || null)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none cursor-pointer"
              >
                <option value="">无</option>
                {availableParents.map(p => (
                  <option key={p.id} value={p.id}>{p.title} ({TYPE_LABELS[p.plan_type]})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs text-white/40 mb-1.5 block">标签</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/[0.08] text-white/70">
                  {t}
                  <button type="button" onClick={() => setTags(tags.filter(tag => tag !== t))} className="text-white/30 hover:text-white/80">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="输入标签后按回车..."
                maxLength={30}
                className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
              />
              <button type="button" onClick={addTag} className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.10] transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] text-white/50 text-sm hover:bg-white/[0.08] transition-colors">
              取消
            </button>
            <button type="submit" disabled={saving || !title.trim()} className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-30 transition-colors">
              {saving ? '保存中...' : (isEdit ? '更新' : '创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
