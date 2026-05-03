import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Eye, Tag, Calendar } from 'lucide-react'

export default function BlogList() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTag = searchParams.get('tag')

  useEffect(() => {
    const fetchPosts = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const isAdmin = session?.user?.email === '1375937000@qq.com'

      let query = supabase
        .from('posts')
        .select('id, title, slug, excerpt, cover_url, tags, view_count, created_at')
        .order('created_at', { ascending: false })

      if (!isAdmin) query = query.eq('is_published', true)
      if (activeTag) query = query.contains('tags', [activeTag])

      const { data } = await query
      setPosts(data || [])
      setLoading(false)
    }
    fetchPosts()
  }, [activeTag])

  const allTags = [...new Set(posts.flatMap(p => p.tags || []))].sort()

  const formatDate = (d) => {
    const date = new Date(d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold text-white mb-8">博客</h1>

      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <button
            onClick={() => setSearchParams({})}
            className={`px-3 py-1 rounded-full text-xs transition-colors ${
              !activeTag ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:text-white/80'
            }`}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSearchParams({ tag })}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                activeTag === tag ? 'bg-white/20 text-white' : 'bg-white/5 text-white/50 hover:text-white/80'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-white/40 text-sm">加载中...</div>
      ) : posts.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-20 text-center text-white/40">
          暂无文章
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map(post => (
            <Link
              key={post.id}
              to={`/blog/${post.slug}`}
              className="liquid-glass rounded-2xl overflow-hidden group hover:bg-white/[0.04] transition-colors"
            >
              <div className="aspect-[16/10] overflow-hidden">
                {post.cover_url ? (
                  <img src={post.cover_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full bg-white/[0.02] flex items-center justify-center">
                    <span className="text-white/10 text-4xl font-bold">SJK</span>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h2 className="text-white font-semibold text-lg leading-snug mb-2 line-clamp-1">{post.title}</h2>
                {post.excerpt && (
                  <p className="text-white/40 text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="flex items-center gap-3 text-white/25 text-xs">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDate(post.created_at)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={12} />
                    {post.view_count || 0}
                  </span>
                  {post.tags?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Tag size={12} />
                      {post.tags.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
