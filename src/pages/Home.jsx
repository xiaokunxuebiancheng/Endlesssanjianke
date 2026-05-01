import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, Heart, MessageCircle, Clock } from 'lucide-react'

const PAGE_SIZE = 6

export default function Home() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    setLoading(true)
    const from = (page - 1) * PAGE_SIZE
    Promise.all([
      supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true),
      supabase
        .from('posts')
        .select('title, slug, excerpt, cover_url, tags, category, view_count, like_count, comment_count, created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1),
    ]).then(([countRes, dataRes]) => {
      setTotal(countRes.count ?? 0)
      setPosts(dataRes.data ?? [])
      setLoading(false)
    })
  }, [page])

  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold text-white mb-10">文章</h1>

      {loading ? (
        <div className="text-white/40 text-sm">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center text-white/40">
          还没有文章
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map(post => (
            <Link key={post.slug} to={`/article/${post.slug}`} className="block group">
              <article className="liquid-glass rounded-2xl p-6 transition-colors hover:bg-white/[0.06]">
                <div className="flex items-start gap-4">
                  {post.cover_url && (
                    <img src={post.cover_url} alt="" className="w-24 h-24 rounded-xl object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-white/30">{post.category}</span>
                      <span className="text-white/10">·</span>
                      <span className="text-[10px] text-white/30 flex items-center gap-1">
                        <Clock size={10} />
                        {new Date(post.created_at).toLocaleDateString('zh-CN')}
                      </span>
                    </div>
                    <h2 className="text-lg font-medium text-white group-hover:text-white/80 transition-colors truncate">
                      {post.title}
                    </h2>
                    {post.excerpt && (
                      <p className="text-sm text-white/50 mt-1 line-clamp-2">{post.excerpt}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-white/30">
                      <span className="flex items-center gap-1"><Eye size={12} /> {post.view_count}</span>
                      <span className="flex items-center gap-1"><Heart size={12} /> {post.like_count}</span>
                      <span className="flex items-center gap-1"><MessageCircle size={12} /> {post.comment_count}</span>
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
          >
            上一页
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-8 h-8 text-xs rounded-lg transition-colors ${
                page === i + 1
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-xs rounded-lg border border-white/10 text-white/60 hover:text-white disabled:opacity-30 transition-colors"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
