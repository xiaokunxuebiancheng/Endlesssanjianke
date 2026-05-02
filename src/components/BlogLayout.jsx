import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Menu, X, LogOut, LogIn } from 'lucide-react'
import MusicPlayer from './MusicPlayer.jsx'

const navLinks = [
  { to: '/', label: '首页' },
  { to: '/about', label: '关于' },
  { to: '/gallery', label: '画廊' },
  { to: '/guestbook', label: '留言板' },
]

export default function BlogLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState(null)
  const location = useLocation()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
  }

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-6 min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between py-6">
        <Link to="/" className="flex items-center gap-2 text-white group">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 256 256" fill="currentColor">
            <path d="M 4.688 136 C 68.373 136 120 187.627 120 251.312 C 120 252.883 119.967 254.445 119.905 256 L 0 256 L 0 136.096 C 1.555 136.034 3.117 136 4.688 136 Z M 251.312 136 C 252.883 136 254.445 136.034 256 136.096 L 256 256 L 136.095 256 C 136.032 254.438 136.001 252.875 136 251.312 C 136 187.627 187.627 136 251.312 136 Z M 119.905 0 C 119.967 1.555 120 3.117 120 4.688 C 120 68.373 68.373 120 4.687 120 C 3.117 120 1.555 119.967 0 119.905 L 0 0 Z M 256 119.905 C 254.445 119.967 252.883 120 251.312 120 C 187.627 120 136 68.373 136 4.687 C 136 3.117 136.033 1.555 136.095 0 L 256 0 Z" />
          </svg>
          <span className="text-lg font-medium text-white">SJK</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to}
              className={`text-sm transition-colors ${location.pathname === l.to ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}>
              {l.label}
            </Link>
          ))}
          {user?.email === '1375937000@qq.com' && (
            <Link to="/admin/users"
              className={`text-sm transition-colors ${location.pathname.startsWith('/admin') ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}>
              管理
            </Link>
          )}
          <MusicPlayer />
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/50">{user.email?.split('@')[0]}</span>
              <button onClick={handleLogout} className="text-white/50 hover:text-white transition-colors" title="退出">
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <Link to="/login" className="text-white/60 hover:text-white transition-colors" title="登录">
              <LogIn size={16} />
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden text-white/70" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="md:hidden flex flex-col gap-4 pb-6">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setMobileOpen(false)}
              className={`text-sm ${location.pathname === l.to ? 'text-white font-medium' : 'text-white/60'}`}>
              {l.label}
            </Link>
          ))}
          {user?.email === '1375937000@qq.com' && (
            <Link to="/admin/users" onClick={() => setMobileOpen(false)} className="text-white/60 text-sm">用户管理</Link>
          )}
          {user ? (
            <button onClick={handleLogout} className="text-white/50 text-sm text-left">退出登录</button>
          ) : (
            <Link to="/login" onClick={() => setMobileOpen(false)} className="text-white/60 text-sm">登录</Link>
          )}
        </div>
      )}

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
