import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { getGuestFingerprint } from '../lib/supabase'
import { Heart, Bookmark, Eye, Clock, ArrowLeft } from 'lucide-react'
import CommentSection from '../components/CommentSection.jsx'

export default function Article() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [actionLoading, setActionLoading] = useState({ like: false, bookmark: false })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
  }, [])

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    supabase
      .from('posts')
      .select('*')
      .eq('slug', slug)
      .eq('is_published', true)
      .single()
      .then(({ data }) => {
        setPost(data)
        setLoading(false)
        if (data) {
          supabase.rpc('increment_view', { row_id: data.id }).then()
          checkUserStatus(data.id)
        }
      })
  }, [slug, user])

  const checkUserStatus = async (postId) => {
    const fp = getGuestFingerprint()
    const likeQuery = supabase.from('likes').select('id').eq('post_id', postId)
    if (user) {
      likeQuery.eq('user_id', user.id)
    } else {
      likeQuery.eq('guest_fingerprint', fp)
    }
    const [{ data: likes }, { data: bookmarks }] = await Promise.all([
      likeQuery,
      user ? supabase.from('bookmarks').select('id').eq('post_id', postId).eq('user_id', user.id) : Promise.resolve({ data: null }),
    ])
    setLiked((likes?.length ?? 0) > 0)
    setBookmarked((bookmarks?.length ?? 0) > 0)
  }

  const handleLike = async () => {
    if (actionLoading.like) return
    setActionLoading(f => ({ ...f, like: true }))

    const fp = getGuestFingerprint()
    if (liked) {
      const query = supabase.from('likes').delete().eq('post_id', post.id)
      if (user) {
        query.eq('user_id', user.id)
      } else {
        query.eq('guest_fingerprint', fp)
      }
      await query
      setLiked(false)
      setPost(p => ({ ...p, like_count: Math.max(0, (p.like_count || 0) - 1) }))
    } else {
      await supabase.from('likes').insert({
        post_id: post.id,
        ...(user ? { user_id: user.id } : { guest_fingerprint: fp }),
      })
      setLiked(true)
      setPost(p => ({ ...p, like_count: (p.like_count || 0) + 1 }))
    }
    setActionLoading(f => ({ ...f, like: false }))
  }

  const handleBookmark = async () => {
    if (!user || actionLoading.bookmark) return
    setActionLoading(f => ({ ...f, bookmark: true }))

    if (bookmarked) {
      await supabase.from('bookmarks').delete().eq('post_id', post.id).eq('user_id', user.id)
      setBookmarked(false)
      setPost(p => ({ ...p, bookmark_count: Math.max(0, (p.bookmark_count || 0) - 1) }))
    } else {
      await supabase.from('bookmarks').insert({ post_id: post.id, user_id: user.id })
      setBookmarked(true)
      setPost(p => ({ ...p, bookmark_count: (p.bookmark_count || 0) + 1 }))
    }
    setActionLoading(f => ({ ...f, bookmark: false }))
  }

  if (loading) {
    return <div className="py-20 text-center text-white/40">加载中...</div>
  }

  if (!post) {
    return (
      <div className="py-20 text-center">
        <p className="text-white/40 mb-4">文章不存在</p>
        <Link to="/" className="text-white/60 hover:text-white text-sm transition-colors">← 返回首页</Link>
      </div>
    )
  }

  return (
    <div className="py-12">
      {/* Back */}
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
        <ArrowLeft size={14} />
        返回首页
      </Link>

      {/* Cover */}
      {post.cover_url && (
        <img src={post.cover_url} alt="" className="w-full h-64 md:h-96 object-cover rounded-3xl mb-8" />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] uppercase tracking-wider text-white/30">{post.category}</span>
          <span className="text-white/10">·</span>
          <span className="text-[10px] text-white/30 flex items-center gap-1">
            <Clock size={10} />
            {new Date(post.created_at).toLocaleDateString('zh-CN')}
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{post.title}</h1>
        {post.tags?.length > 0 && (
          <div className="flex items-center gap-2">
            {post.tags.map(tag => (
              <span key={tag} className="px-2.5 py-0.5 text-[10px] rounded-full bg-white/[0.06] text-white/40">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-10 py-4 border-y border-white/[0.06]">
        <div className="flex items-center gap-1.5 text-sm text-white/30">
          <Eye size={14} /> {post.view_count ?? 0}
        </div>
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? 'text-red-400' : 'text-white/30 hover:text-white/60'
          }`}
        >
          <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
          {post.like_count ?? 0}
        </button>
        <button
          onClick={handleBookmark}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            bookmarked ? 'text-amber-400' : 'text-white/30 hover:text-white/60'
          }`}
          title={user ? '' : '请先登录'}
        >
          <Bookmark size={14} fill={bookmarked ? 'currentColor' : 'none'} />
          {post.bookmark_count ?? 0}
        </button>
      </div>

      {/* Content */}
      <article className="prose prose-invert max-w-none mb-16">
        <div
          className="text-white/80 leading-relaxed text-[15px] whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      {/* Comments */}
      <CommentSection postId={post.id} />
    </div>
  )
}
