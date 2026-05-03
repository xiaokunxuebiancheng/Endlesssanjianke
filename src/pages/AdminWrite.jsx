import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Save, ArrowLeft } from 'lucide-react'

export default function AdminWrite() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [tags, setTags] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editSlug = searchParams.get('slug')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const admin = data.session?.user?.email === '1375937000@qq.com'
      setIsAdmin(admin)
      if (!admin) {
        setChecking(false)
        return
      }
      if (editSlug) {
        const { data: post } = await supabase.from('posts').select('*').eq('slug', editSlug).single()
        if (post) {
          setTitle(post.title)
          setContent(post.content)
          setExcerpt(post.excerpt || '')
          setTags((post.tags || []).join(', '))
          setCoverUrl(post.cover_url || '')
        }
      }
      setChecking(false)
    })
  }, [editSlug])

  const handleSave = async (publish) => {
    setSaving(true)
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const slug = title
      .replace(/[^a-zA-Z0-9一-鿿]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || Date.now().toString(36)

    const { data: { session } } = await supabase.auth.getSession()

    const { data: result, error: rpcError } = await supabase.rpc('upsert_post', {
      p_title: title,
      p_slug: editSlug || slug,
      p_content: content,
      p_excerpt: excerpt,
      p_tags: tagArray,
      p_cover_url: coverUrl || null,
      p_is_published: publish,
      p_author_id: session.user.id,
    })

    if (rpcError) {
      setError(rpcError.message)
      setSaving(false)
      return
    }

    setSaving(false)
    if (publish) navigate(`/blog/${result.slug}`)
  }

  if (checking) return <div className="py-12 text-white/40 text-sm">加载中...</div>
  if (!isAdmin) return <div className="py-12 liquid-glass rounded-3xl p-20 text-center text-white/40">无权限</div>

  return (
    <div className="py-12 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft size={14} />
        返回
      </button>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="文章标题"
        className="w-full bg-transparent text-3xl font-bold text-white placeholder:text-white/15 outline-none mb-6"
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-white/30 text-xs mb-1.5">标签（逗号分隔）</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="JavaScript, React, 教程"
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/10 outline-none"
          />
        </div>
        <div>
          <label className="block text-white/30 text-xs mb-1.5">封面图 URL</label>
          <input
            type="text"
            value={coverUrl}
            onChange={e => setCoverUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/10 outline-none"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-white/30 text-xs mb-1.5">摘要</label>
        <textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          rows={2}
          placeholder="文章摘要..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/10 outline-none resize-none"
        />
      </div>

      <div className="mb-6">
        <label className="block text-white/30 text-xs mb-1.5">内容</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={18}
          placeholder="写点什么..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/10 outline-none resize-none font-mono"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-30 transition-colors"
        >
          <Save size={16} />
          存草稿
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30 transition-colors"
        >
          发布
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
