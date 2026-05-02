import { Link } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'

export default function Home() {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center min-h-[60vh]">
      <p className="text-sm text-gray-500 max-w-md mb-12">
        欢迎来到我的个人空间
      </p>

      <Link
        to="/guestbook"
        className="liquid-glass rounded-2xl px-8 py-4 flex items-center gap-3 text-gray-900 hover:bg-black/[0.06] transition-colors"
      >
        <MessageSquare size={20} />
        <div className="text-left">
          <div className="text-sm font-medium">留言板</div>
          <div className="text-[10px] text-gray-400">留下你的足迹</div>
        </div>
      </Link>
    </div>
  )
}
