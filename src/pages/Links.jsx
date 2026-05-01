import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { ExternalLink } from 'lucide-react'

export default function Links() {
  const [links, setLinks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('friends_links')
      .select('*')
      .eq('is_approved', true)
      .order('sort_order', { ascending: false })
      .then(({ data }) => {
        setLinks(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="py-12">
      <h1 className="text-3xl font-bold text-white mb-2">友链</h1>
      <p className="text-sm text-white/40 mb-10">友情链接，感谢相遇</p>

      {loading ? (
        <div className="text-white/40 text-sm">加载中...</div>
      ) : links.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center text-white/40">
          暂无友链
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {links.map(link => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="liquid-glass rounded-2xl p-5 flex items-center gap-4 transition-colors hover:bg-white/[0.06] group"
            >
              <img
                src={link.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(link.name)}&background=ffffff20&color=fff&size=48`}
                alt={link.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-white group-hover:text-white/80 transition-colors">
                    {link.name}
                  </span>
                  <ExternalLink size={12} className="text-white/20" />
                </div>
                {link.description && (
                  <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{link.description}</p>
                )}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
