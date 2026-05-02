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
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          {isSignUp ? '注册' : '登录'}
        </h1>
        <p className="text-sm text-gray-400 text-center mb-8">
          {isSignUp ? '创建账号加入博客' : '登录以管理博客'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/[0.03] border border-black/[0.06]">
            <Mail size={16} className="text-gray-400 shrink-0" />
            <input
              type="email"
              placeholder="邮箱"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-300 outline-none"
              required
            />
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-black/[0.03] border border-black/[0.06]">
            <Lock size={16} className="text-gray-400 shrink-0" />
            <input
              type="password"
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-300 outline-none"
              required
              minLength={6}
            />
          </div>

          {error && (
            <p className={`text-xs ${error.includes('成功') ? 'text-green-600' : 'text-red-500'}`}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-black/5 text-gray-700 text-sm font-medium hover:bg-black/10 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {isSignUp ? '注册' : '登录'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          {isSignUp ? '已有账号？' : '没有账号？'}
          <button
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
            className="text-gray-600 hover:text-gray-900 ml-1 transition-colors"
          >
            {isSignUp ? '去登录' : '去注册'}
          </button>
        </p>
      </div>
    </div>
  )
}
