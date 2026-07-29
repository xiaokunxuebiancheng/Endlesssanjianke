import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  Plus, ChevronRight, ChevronDown, Calendar, Tag, Trash2, Edit3,
  Target, Layers, ListTodo, Star, Clock, AlertCircle, CheckCircle2,
  Circle, X, BookOpen, ArrowUp, Filter
} from 'lucide-react'

const STATUS_CONFIG = {
  not_started: { label: '未开始', icon: Circle, color: 'text-white/35' },
  in_progress: { label: '进行中', icon: Clock, color: 'text-blue-400' },
  completed: { label: '已完成', icon: CheckCircle2, color: 'text-green-400' },
  cancelled: { label: '已取消', icon: X, color: 'text-white/20' },
}

const PRIORITY_CONFIG = {
  low: { label: '低', bg: 'bg-slate-400/15 text-slate-300', dot: 'bg-slate-400' },
  medium: { label: '中', bg: 'bg-blue-400/15 text-blue-300', dot: 'bg-blue-400' },
  high: { label: '高', bg: 'bg-orange-400/15 text-orange-300', dot: 'bg-orange-400' },
  urgent: { label: '紧急', bg: 'bg-red-400/15 text-red-300', dot: 'bg-red-400' },
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
  const [expanded, setExpanded] = useState({})
  const [showForm, setShowForm] = useState(false)
  const [editingPlan, setEditingPlan] = useState(null)
  const [filterType, setFilterType] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

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

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const childrenOf = (parentId) =>
    plans.filter(p => p.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at))

  const topLevelPlans = (type) =>
    plans.filter(p => p.plan_type === type && !p.parent_id).sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at))

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

  const filteredPlans = (list) => {
    return list.filter(p => {
      if (filterStatus !== 'all' && p.status !== filterStatus) return false
      return true
    })
  }

  // Recursive plan item component
  const PlanItem = ({ plan, level = 0 }) => {
    const children = childrenOf(plan.id)
    const isExpanded = expanded[plan.id] ?? (level < 1)
    const StatusIcon = STATUS_CONFIG[plan.status].icon
    const TypeIcon = TYPE_ICONS[plan.plan_type] || ListTodo
    const prio = PRIORITY_CONFIG[plan.priority]
    const overdue = isOverdue(plan.due_date) && plan.status !== 'completed' && plan.status !== 'cancelled'

    return (
      <div className="select-none">
        <div
          className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer
            ${level === 0 ? 'liquid-glass' : level === 1 ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-white/[0.02] hover:bg-white/[0.04]'}
            ${plan.status === 'completed' ? 'opacity-60' : ''}
            ${plan.status === 'cancelled' ? 'opacity-40 line-through' : ''}
          `}
          style={{ marginLeft: level * 16 }}
        >
          {/* Expand/collapse */}
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(plan.id) }}
            className="p-0.5 text-white/25 hover:text-white/60 transition-colors shrink-0"
          >
            {children.length > 0 ? (
              isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="w-[14px] block" />
            )}
          </button>

          {/* Status toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); cycleStatus(plan) }}
            className="shrink-0 text-white/40 hover:text-white transition-colors"
            title={STATUS_CONFIG[plan.status].label}
          >
            <StatusIcon size={16} className={STATUS_CONFIG[plan.status].color} />
          </button>

          {/* Type icon */}
          <TypeIcon size={14} className="text-white/20 shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0" onClick={() => openEdit(plan)}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm font-medium ${plan.status === 'completed' ? 'text-white/40' : 'text-white/85'}`}>
                {plan.title}
              </span>
              {/* Priority badge */}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${prio.bg}`}>
                {prio.label}
              </span>
              {/* Type badge */}
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30">
                {TYPE_LABELS[plan.plan_type]}
              </span>
              {/* Tags */}
              {(plan.tags || []).slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-white/40 flex items-center gap-1">
                  <Tag size={8} />{tag}
                </span>
              ))}
            </div>
            {plan.description && (
              <p className="text-xs text-white/30 mt-0.5 line-clamp-1">{plan.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1 text-[10px] text-white/25">
              {plan.due_date && (
                <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
                  <Calendar size={10} />
                  {formatDate(plan.due_date)}
                  {overdue && <span className="text-red-400/80">逾期</span>}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {formatDate(plan.created_at)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            {plan.plan_type !== 'daily' && (
              <button
                onClick={(e) => { e.stopPropagation(); openCreate(plan.id, plan.plan_type === 'monthly' ? 'weekly' : 'daily') }}
                className="p-1.5 rounded-lg text-white/25 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
                title={`添加${plan.plan_type === 'monthly' ? '周计划' : '日待办'}`}
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
        </div>

        {/* Children */}
        {children.length > 0 && isExpanded && (
          <div className="mt-0.5">
            {filteredPlans(children).map(child => (
              <PlanItem key={child.id} plan={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Target size={24} className="text-white/60" />
          <h1 className="text-3xl font-bold text-white">计划管理</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Filters */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/60 outline-none cursor-pointer"
          >
            <option value="all">全部类型</option>
            <option value="monthly">月度目标</option>
            <option value="weekly">周计划</option>
            <option value="daily">日待办</option>
          </select>
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
            新建目标
          </button>
        </div>
      </div>

      {/* Plan list */}
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
        <div className="space-y-8">
          {/* Monthly goals as top level sections */}
          {(filterType === 'all' || filterType === 'monthly') && topLevelPlans('monthly').length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-white/40 mb-3 flex items-center gap-2">
                <Target size={14} /> 月度目标
              </h2>
              <div className="space-y-1">
                {filteredPlans(topLevelPlans('monthly')).map(plan => (
                  <PlanItem key={plan.id} plan={plan} level={0} />
                ))}
              </div>
            </section>
          )}

          {/* Unparented weeklies */}
          {(filterType === 'all' || filterType === 'weekly') && topLevelPlans('weekly').length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-white/40 mb-3 flex items-center gap-2">
                <Layers size={14} /> 独立周计划
              </h2>
              <div className="space-y-1">
                {filteredPlans(topLevelPlans('weekly')).map(plan => (
                  <PlanItem key={plan.id} plan={plan} level={0} />
                ))}
              </div>
            </section>
          )}

          {/* Unparented dailies */}
          {(filterType === 'all' || filterType === 'daily') && topLevelPlans('daily').length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-white/40 mb-3 flex items-center gap-2">
                <ListTodo size={14} /> 独立日待办
              </h2>
              <div className="space-y-1">
                {filteredPlans(topLevelPlans('daily')).map(plan => (
                  <PlanItem key={plan.id} plan={plan} level={0} />
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

  // Get available parent plans based on type
  const availableParents = plans.filter(p =>
    p.id !== plan?.id &&
    ((planType === 'weekly' && p.plan_type === 'monthly') ||
     (planType === 'daily' && p.plan_type === 'weekly'))
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)

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
    }

    const { data: { session } } = await supabase.auth.getSession()
    payload.user_id = session.user.id

    if (isEdit) {
      await supabase.from('plans').update(payload).eq('id', plan.id)
    } else {
      await supabase.from('plans').insert(payload)
    }

    onSaved()
    onClose()
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) {
      setTags([...tags, t])
    }
    setTagInput('')
  }

  const removeTag = (t) => {
    setTags(tags.filter(tag => tag !== t))
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
          {/* Title */}
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

          {/* Description */}
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

          {/* Type & Priority */}
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
                <option value="low">🟢 低</option>
                <option value="medium">🔵 中</option>
                <option value="high">🟠 高</option>
                <option value="urgent">🔴 紧急</option>
              </select>
            </div>
          </div>

          {/* Status & Due Date */}
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

          {/* Parent plan */}
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
                  <option key={p.id} value={p.id}>
                    {p.title} ({TYPE_LABELS[p.plan_type]})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">标签</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-white/[0.08] text-white/70">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="text-white/30 hover:text-white/80">
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
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2.5 rounded-xl bg-white/[0.06] text-white/60 text-sm hover:bg-white/[0.10] transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] text-white/50 text-sm hover:bg-white/[0.08] transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              {saving ? '保存中...' : (isEdit ? '更新' : '创建')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
