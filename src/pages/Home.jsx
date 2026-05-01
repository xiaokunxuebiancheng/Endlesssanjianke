import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'

export default function Home() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">宋佳坤</h1>
      <p className="text-lg text-white/40 mb-2">三剑客</p>
      <p className="text-sm text-white/30 max-w-md mb-12">
        欢迎来到我的个人空间
      </p>

      <Link
        to="/guestbook"
        className="liquid-glass rounded-2xl px-8 py-4 flex items-center gap-3 text-white hover:bg-white/[0.06] transition-colors"
      >
        <MessageSquare size={20} />
        <div className="text-left">
          <div className="text-sm font-medium">留言板</div>
          <div className="text-[10px] text-white/30">留下你的足迹</div>
        </div>
      </Link>
    </div>
  )
}
