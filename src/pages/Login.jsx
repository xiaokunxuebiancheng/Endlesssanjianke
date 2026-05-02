import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Mail, Lock, Loader2 } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (err) {
      setError(err.message)
    } else if (isSignUp) {
      setError('注册成功！请检查邮箱确认链接（如已开启邮箱确认），然后登录。')
      setIsSignUp(false)
    } else {
      navigate('/')
    }
    setLoading(false)
  }

  return (
    <div className="py-20 flex items-center justify-center">
      <div className="liquid-glass rounded-3xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          {isSignUp ? '注册' : '登录'}
        </h1>
        <p className="text-sm text-white/40 text-center mb-8">
          {isSignUp ? '创建账号加入博客' : '登录以管理博客'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <Mail size={16} className="text-white/30 shrink-0" />
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
              required
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
            <Lock size={16} className="text-white/30 shrink-0" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className={`text-xs ${error.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white/10 text-white text-sm font-medium hover:bg-white/20 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isSignUp ? '注册' : '登录'}
          </button>
        </form>

        <p className="text-xs text-white/30 text-center mt-6">
          {isSignUp ? '已有账号？' : '没有账号？'}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-white/60 hover:text-white ml-1 transition-colors"
          >
            {isSignUp ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </div>
  )
}
