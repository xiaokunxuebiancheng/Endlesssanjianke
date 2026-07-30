import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ADMIN_EMAIL } from '../lib/constants'
import {
  BookOpen, Plus, Trash2, Edit3, Star, X, Clock, Calendar,
  CheckCircle2, Bookmark, Library, Search
} from 'lucide-react'

const STATUS_CONFIG = {
  reading: { label: '在读', icon: BookOpen, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  finished: { label: '已读完', icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-400/10' },
  wishlist: { label: '想读', icon: Bookmark, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
}

function formatDate(d) {
  if (!d) return ''
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function Stars({ rating, onRate, interactive = false }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
        >
          <Star
            size={14}
            className={i <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'}
          />
        </button>
      ))}
    </div>
  )
}

export default function ReadingNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState(null)
  const [filterStatus, setFilterStatus] = useState('all')
  const [search, setSearch] = useState('')

  const fetchNotes = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const admin = session?.user?.email === ADMIN_EMAIL
    setIsAdmin(admin)
    if (!admin) { setNotes([]); setLoading(false); return }

    const { data } = await supabase
      .from('reading_notes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('updated_at', { ascending: false })

    setNotes(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  const deleteNote = async (id) => {
    if (!confirm('确定要删除这条读书笔记吗？')) return
    await supabase.from('reading_notes').delete().eq('id', id)
    fetchNotes()
  }

  const openCreate = () => {
    setEditingNote(null)
    setShowForm(true)
  }

  const openEdit = (note) => {
    setEditingNote(note)
    setShowForm(true)
  }

  const filteredNotes = notes.filter(n => {
    if (filterStatus !== 'all' && n.status !== filterStatus) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        n.book_title.toLowerCase().includes(q) ||
        n.author.toLowerCase().includes(q) ||
        (n.notes || '').toLowerCase().includes(q)
      )
    }
    return true
  })

  const stats = {
    total: notes.length,
    reading: notes.filter(n => n.status === 'reading').length,
    finished: notes.filter(n => n.status === 'finished').length,
    wishlist: notes.filter(n => n.status === 'wishlist').length,
  }

  return (
    <div className="py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Library size={24} className="text-white/60" />
          <h1 className="text-3xl font-bold text-white">读书笔记</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
        >
          <Plus size={16} />
          添加笔记
        </button>
      </div>

      {/* Stats bar */}
      {notes.length > 0 && (
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-white/40">
            <Library size={12} />
            共 {stats.total} 本
          </div>
          <div className="flex items-center gap-1.5 text-xs text-blue-400/70">
            <BookOpen size={12} />
            {stats.reading} 在读
          </div>
          <div className="flex items-center gap-1.5 text-xs text-green-400/70">
            <CheckCircle2 size={12} />
            {stats.finished} 已读
          </div>
          <div className="flex items-center gap-1.5 text-xs text-yellow-400/70">
            <Bookmark size={12} />
            {stats.wishlist} 想读
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 flex-1 max-w-xs">
          <Search size={14} className="text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索书名、作者或笔记..."
            className="bg-transparent text-sm text-white placeholder:text-white/20 outline-none w-full"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-xs bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-white/60 outline-none cursor-pointer"
        >
          <option value="all">全部状态</option>
          <option value="reading">在读</option>
          <option value="finished">已读完</option>
          <option value="wishlist">想读</option>
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-white/40 text-sm text-center py-20">加载中...</div>
      ) : !isAdmin ? (
        <div className="liquid-glass rounded-3xl p-20 text-center">
          <span className="text-4xl block mb-4 opacity-30">🔒</span>
          <p className="text-white/30 text-sm">仅管理员可访问</p>
        </div>
      ) : filteredNotes.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-20 text-center">
          <BookOpen size={40} className="text-white/15 mx-auto mb-4" />
          <p className="text-white/30 text-sm mb-4">
            {notes.length === 0 ? '还没有读书笔记' : '没有找到匹配的笔记'}
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors"
          >
            <Plus size={16} />
            添加第一条笔记
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map(note => {
            const s = STATUS_CONFIG[note.status]
            return (
              <div
                key={note.id}
                className={`liquid-glass rounded-2xl p-5 group cursor-pointer hover:bg-white/[0.04] transition-colors ${note.status === 'finished' ? 'opacity-75' : ''}`}
                onClick={() => openEdit(note)}
              >
                {/* Cover + Info */}
                <div className="flex gap-4 mb-4">
                  {/* Book cover */}
                  <div className="w-16 h-22 shrink-0 rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]">
                    {note.cover_url ? (
                      <img src={note.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={20} className="text-white/15" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium text-sm leading-snug mb-1 line-clamp-2">
                      {note.book_title}
                    </h3>
                    {note.author && (
                      <p className="text-white/35 text-xs mb-2">{note.author}</p>
                    )}
                    <Stars rating={note.rating || 0} />
                  </div>
                </div>

                {/* Status badge */}
                <div className="flex items-center justify-between mb-3">
                  <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${s.bg} ${s.color}`}>
                    <s.icon size={10} />
                    {s.label}
                  </span>
                  {(note.started_date || note.finished_date) && (
                    <span className="text-[10px] text-white/25 flex items-center gap-1">
                      <Calendar size={10} />
                      {formatDate(note.finished_date || note.started_date)}
                    </span>
                  )}
                </div>

                {/* Notes preview */}
                {note.notes && (
                  <p className="text-xs text-white/30 leading-relaxed line-clamp-3 mb-3">
                    {note.notes}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(note) }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] text-xs transition-colors"
                  >
                    <Edit3 size={11} />编辑
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id) }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 text-xs transition-colors"
                  >
                    <Trash2 size={11} />删除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showForm && <ReadingNoteFormModal note={editingNote} onClose={() => { setShowForm(false); setEditingNote(null) }} onSaved={fetchNotes} />}
    </div>
  )
}

function ReadingNoteFormModal({ note, onClose, onSaved }) {
  const isEdit = !!note?.id
  const [bookTitle, setBookTitle] = useState(note?.book_title || '')
  const [author, setAuthor] = useState(note?.author || '')
  const [coverUrl, setCoverUrl] = useState(note?.cover_url || '')
  const [notes, setNotes] = useState(note?.notes || '')
  const [rating, setRating] = useState(note?.rating || 0)
  const [status, setStatus] = useState(note?.status || 'reading')
  const [startedDate, setStartedDate] = useState(note?.started_date || '')
  const [finishedDate, setFinishedDate] = useState(note?.finished_date || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!bookTitle.trim()) return
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
        book_title: bookTitle.trim(),
        author: author.trim(),
        cover_url: coverUrl.trim() || null,
        notes: notes.trim(),
        rating: rating || null,
        status,
        started_date: startedDate || null,
        finished_date: status === 'finished' ? (finishedDate || new Date().toISOString().slice(0, 10)) : (finishedDate || null),
        user_id: session.user.id,
      }

      if (isEdit) {
        const { error: updateErr } = await supabase.from('reading_notes').update(payload).eq('id', note.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase.from('reading_notes').insert(payload)
        if (insertErr) throw insertErr
      }

      onSaved()
      onClose()
    } catch (err) {
      setError(err.message || '保存失败，请重试')
      setSaving(false)
    }
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
            {isEdit ? '编辑笔记' : '添加读书笔记'}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Book Title */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">书名 *</label>
            <input
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              placeholder="书名..."
              maxLength={200}
              autoFocus
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Author & Rating */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">作者</label>
              <input
                value={author}
                onChange={e => setAuthor(e.target.value)}
                placeholder="作者..."
                maxLength={100}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">评分</label>
              <div className="flex items-center gap-0.5 pt-2">
                <Stars rating={rating} onRate={setRating} interactive />
              </div>
            </div>
          </div>

          {/* Cover URL */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">封面图片 URL</label>
            <input
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">阅读状态</label>
            <div className="flex gap-2">
              {Object.entries(STATUS_CONFIG).map(([key, s]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatus(key)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-colors ${
                    status === key
                      ? `bg-white/15 text-white`
                      : 'bg-white/[0.04] text-white/40 hover:text-white/70'
                  }`}
                >
                  <s.icon size={14} className={s.color} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">开始日期</label>
              <input
                type="date"
                value={startedDate}
                onChange={e => setStartedDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">完成日期</label>
              <input
                type="date"
                value={finishedDate}
                onChange={e => setFinishedDate(e.target.value)}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">笔记</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="记录你的想法和摘录..."
              rows={5}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 outline-none resize-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="px-4 py-2.5 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs">
              {error}
            </div>
          )}

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
              disabled={saving || !bookTitle.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-30 transition-colors"
            >
              {saving ? '保存中...' : (isEdit ? '更新' : '添加')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
