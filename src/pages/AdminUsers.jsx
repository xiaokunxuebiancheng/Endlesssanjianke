import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Shield, Users, Loader2 } from 'lucide-react'

export default function AdminUsers() {
  const [role, setRole] = useState(null)
  const [checking, setChecking] = useState(true)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const user = data.session?.user
      if (!user) { navigate('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        setRole('user')
        setChecking(false)
        return
      }

      setRole('admin')
      setChecking(false)
      fetchUsers()
    })
  }, [])

  const fetchUsers = async () => {
    const [{ count }, { data }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('email, nickname, role, created_at').order('created_at', { ascending: false }),
    ])
    setTotal(count ?? 0)
    setUsers(data ?? [])
    setLoading(false)
  }

  if (checking) {
    return (
      <div className="py-20 text-center">
        <Loader2 size={20} className="animate-spin text-white/40 mx-auto" />
      </div>
    )
  }

  if (role !== 'admin') {
    return (
      <div className="py-20 text-center">
        <Shield size={40} className="text-white/20 mx-auto mb-4" />
        <p className="text-white/40">无权访问此页面</p>
      </div>
    )
  }

  return (
    <div className="py-12">
      <div className="flex items-center gap-3 mb-8">
        <Users size={24} className="text-white/50" />
        <h1 className="text-3xl font-bold text-white">用户管理</h1>
      </div>

      <div className="liquid-glass rounded-2xl overflow-hidden">
        {/* Stats */}
        <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-6">
          <span className="text-sm text-white/50">共 <span className="text-white font-medium">{total}</span> 位注册用户</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-white/40">加载中...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-white/40">暂无注册用户</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06] text-white/30 text-xs">
                  <th className="text-left px-6 py-3 font-medium">邮箱</th>
                  <th className="text-left px-6 py-3 font-medium">昵称</th>
                  <th className="text-left px-6 py-3 font-medium">角色</th>
                  <th className="text-left px-6 py-3 font-medium">注册时间</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.email} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-3 text-white/70">{u.email || '-'}</td>
                    <td className="px-6 py-3 text-white/50">{u.nickname || '-'}</td>
                    <td className="px-6 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        u.role === 'admin' ? 'bg-amber-400/10 text-amber-400' : 'bg-white/5 text-white/40'
                      }`}>
                        {u.role === 'admin' ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-white/30 text-xs">
                      {new Date(u.created_at).toLocaleDateString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
