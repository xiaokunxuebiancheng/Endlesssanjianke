import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Eye, Tag, Calendar } from 'lucide-react'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const admin = session?.user?.email === '1375937000@qq.com'
      setIsAdmin(admin)

      let query = supabase.from('posts').select('*').eq('slug', slug)
      if (!admin) query = query.eq('is_published', true)
      const { data } = await query.single()

      if (data) {
        setPost(data)
        supabase.rpc('increment_view', { row_id: data.id })
      }
      setLoading(false)
    }
    fetchPost()
  }, [slug])

  const formatDate = (d) => {
    const date = new Date(d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  if (loading) return <div className="py-12 text-white/40 text-sm">加载中...</div>
  if (!post) return (
    <div className="py-12 liquid-glass rounded-3xl p-20 text-center text-white/40">
      文章不存在
    </div>
  )

  return (
    <div className="py-12 max-w-3xl mx-auto">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft size={14} />
        返回博客
      </Link>

      {post.cover_url && (
        <img src={post.cover_url} alt="" className="w-full rounded-2xl object-cover max-h-[400px] mb-8" />
      )}

      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{post.title}</h1>

      <div className="flex flex-wrap items-center gap-4 text-white/30 text-sm mb-8">
        <span className="flex items-center gap-1"><Calendar size={14} />{formatDate(post.created_at)}</span>
        <span className="flex items-center gap-1"><Eye size={14} />{post.view_count || 0} 次阅读</span>
        {post.tags?.map(t => (
          <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
            <Tag size={10} />{t}
          </Link>
        ))}
        {isAdmin && (
          <Link to={`/admin/write?slug=${encodeURIComponent(post.slug)}`}
            className="px-3 py-1 rounded-full bg-white/10 text-white/60 hover:text-white text-xs transition-colors ml-auto">
            编辑
          </Link>
        )}
        {!post.is_published && (
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">草稿</span>
        )}
      </div>

      <div className="text-white/70 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>
    </div>
  )
}
