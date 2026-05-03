# Blog Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add blog list, detail, and admin editor pages using the existing `posts` table.

**Architecture:** Three new page components (BlogList, BlogPost, AdminWrite) plus route/nav changes. All data from existing Supabase `posts` table. Follows existing patterns: Tailwind v4, liquid-glass cards, lucide-react icons.

**Tech Stack:** React 19, React Router 7, Supabase JS, Tailwind CSS v4, lucide-react

---

### Task 1: Add blog routes to App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Add route imports and route elements**

Add imports for the three new pages at the top of App.jsx:

```jsx
import BlogList from './pages/BlogList.jsx'
import BlogPost from './pages/BlogPost.jsx'
import AdminWrite from './pages/AdminWrite.jsx'
```

Add routes inside `<Route element={<BlogLayout />}>`:

```jsx
<Route path="blog" element={<BlogList />} />
<Route path="blog/:slug" element={<BlogPost />} />
<Route path="admin/write" element={<AdminWrite />} />
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add blog routes to App"
```

---

### Task 2: Add blog nav links to BlogLayout

**Files:**
- Modify: `src/components/BlogLayout.jsx`

- [ ] **Step 1: Add "博客" link to navLinks array**

Update the `navLinks` array at line 7:

```jsx
const navLinks = [
  { to: '/', label: '首页' },
  { to: '/about', label: '关于' },
  { to: '/blog', label: '博客' },
  { to: '/gallery', label: '画廊' },
  { to: '/guestbook', label: '留言板' },
]
```

- [ ] **Step 2: Add "写文章" link in admin section of desktop nav**

After the existing admin "管理" link (line 69-73), add:

```jsx
<Link to="/admin/write"
  className={`text-sm transition-colors ${location.pathname === '/admin/write' ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}>
  写文章
</Link>
```

- [ ] **Step 3: Add mobile nav equivalent**

After the mobile "用户管理" link (line 103-105), add:

```jsx
<Link to="/admin/write" onClick={() => setMobileOpen(false)} className="text-white/60 text-sm">写文章</Link>
```

- [ ] **Step 4: Commit**

```bash
git add src/components/BlogLayout.jsx
git commit -m "feat: add blog nav links"
```

---

### Task 3: Create BlogList page

**Files:**
- Create: `src/pages/BlogList.jsx`

- [ ] **Step 1: Write the component**

```jsx
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
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BlogList.jsx
git commit -m "feat: add blog list page with tag filtering"
```

---

### Task 4: Create BlogPost detail page

**Files:**
- Create: `src/pages/BlogPost.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, Eye, Tag, Calendar } from 'lucide-react'

export default function BlogPost() {
  const { slug } = useParams()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const fetchPost = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const admin = session?.user?.email === '1375937000@qq.com'
      setIsAdmin(admin)

      let query = supabase.from('posts').select('*').eq('slug', slug)
      if (!admin) query = query.eq('is_published', true)
      const { data } = await query.single()

      if (data) {
        setPost(data)
        supabase.rpc('increment_view', { row_id: data.id })
      }
      setLoading(false)
    }
    fetchPost()
  }, [slug])

  const formatDate = (d) => {
    const date = new Date(d)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  if (loading) return <div className="py-12 text-white/40 text-sm">加载中...</div>
  if (!post) return (
    <div className="py-12 liquid-glass rounded-3xl p-20 text-center text-white/40">
      文章不存在
    </div>
  )

  return (
    <div className="py-12 max-w-3xl mx-auto">
      <Link to="/blog" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft size={14} />
        返回博客
      </Link>

      {post.cover_url && (
        <img src={post.cover_url} alt="" className="w-full rounded-2xl object-cover max-h-[400px] mb-8" />
      )}

      <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">{post.title}</h1>

      <div className="flex flex-wrap items-center gap-4 text-white/30 text-sm mb-8">
        <span className="flex items-center gap-1"><Calendar size={14} />{formatDate(post.created_at)}</span>
        <span className="flex items-center gap-1"><Eye size={14} />{post.view_count || 0} 次阅读</span>
        {post.tags?.map(t => (
          <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors">
            <Tag size={10} />{t}
          </Link>
        ))}
        {isAdmin && (
          <Link to={`/admin/write?slug=${encodeURIComponent(post.slug)}`}
            className="px-3 py-1 rounded-full bg-white/10 text-white/60 hover:text-white text-xs transition-colors ml-auto">
            编辑
          </Link>
        )}
        {!post.is_published && (
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">草稿</span>
        )}
      </div>

      <div className="prose prose-invert prose-sm max-w-none text-white/70 leading-relaxed whitespace-pre-wrap">
        {post.content}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/BlogPost.jsx
git commit -m "feat: add blog post detail page with view counting"
```

---

### Task 5: Create AdminWrite editor page

**Files:**
- Create: `src/pages/AdminWrite.jsx`

- [ ] **Step 1: Write the component**

```jsx
import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Save, ArrowLeft } from 'lucide-react'

export default function AdminWrite() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [excerpt, setExcerpt] = useState('')
  const [tags, setTags] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checking, setChecking] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const editSlug = searchParams.get('slug')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const admin = data.session?.user?.email === '1375937000@qq.com'
      setIsAdmin(admin)
      if (!admin) {
        setChecking(false)
        return
      }
      if (editSlug) {
        const { data: post } = await supabase.from('posts').select('*').eq('slug', editSlug).single()
        if (post) {
          setTitle(post.title)
          setContent(post.content)
          setExcerpt(post.excerpt || '')
          setTags((post.tags || []).join(', '))
          setCoverUrl(post.cover_url || '')
          setPublished(post.is_published)
        }
      }
      setChecking(false)
    })
  }, [editSlug])

  const handleSave = async (publish) => {
    setSaving(true)
    const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean)
    const slug = title
      .replace(/[^a-zA-Z0-9一-龥]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || Date.now().toString(36)

    const { data: { session } } = await supabase.auth.getSession()
    const payload = {
      title,
      slug: editSlug || slug,
      content,
      excerpt,
      tags: tagArray,
      cover_url: coverUrl || null,
      is_published: publish,
      author_id: session.user.id,
    }

    if (editSlug) {
      await supabase.from('posts').update(payload).eq('slug', editSlug)
    } else {
      await supabase.from('posts').insert(payload)
    }

    setSaving(false)
    if (publish) navigate(`/blog/${editSlug || slug}`)
  }

  if (checking) return <div className="py-12 text-white/40 text-sm">加载中...</div>
  if (!isAdmin) return <div className="py-12 liquid-glass rounded-3xl p-20 text-center text-white/40">无权限</div>

  return (
    <div className="py-12 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-white/40 hover:text-white text-sm mb-8 transition-colors">
        <ArrowLeft size={14} />
        返回
      </button>

      <input
        type="text"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="文章标题"
        className="w-full bg-transparent text-3xl font-bold text-white placeholder:text-white/15 outline-none mb-6"
      />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-white/30 text-xs mb-1.5">标签（逗号分隔）</label>
          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="JavaScript, React, 教程"
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/10 outline-none"
          />
        </div>
        <div>
          <label className="block text-white/30 text-xs mb-1.5">封面图 URL</label>
          <input
            type="text"
            value={coverUrl}
            onChange={e => setCoverUrl(e.target.value)}
            placeholder="https://..."
            className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-2 text-white text-sm placeholder:text-white/10 outline-none"
          />
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-white/30 text-xs mb-1.5">摘要</label>
        <textarea
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          rows={2}
          placeholder="文章摘要..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/10 outline-none resize-none"
        />
      </div>

      <div className="mb-6">
        <label className="block text-white/30 text-xs mb-1.5">内容（Markdown）</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={18}
          placeholder="写点什么..."
          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white text-sm placeholder:text-white/10 outline-none resize-none font-mono"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => handleSave(false)}
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-30 transition-colors"
        >
          <Save size={16} />
          存草稿
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving || !title.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-30 transition-colors"
        >
          发布
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/AdminWrite.jsx
git commit -m "feat: add admin blog editor page"
```

---

### Task 6: Build, verify, and push

**Files:** none (build only)

- [ ] **Step 1: Build the project**

```bash
npm run build
```

Expected: Build succeeds with no errors. New JS/CSS hashes in dist output.

- [ ] **Step 2: Push to GitHub**

```bash
git push
```

- [ ] **Step 3: Verify manual test checklist**

After Vercel deploys, verify:
- Navigate to `/blog` — see empty state "暂无文章" (or existing posts if any)
- Navigate to `/admin/write` — admin-only page with editor
- Create a published post via `/admin/write`
- Verify post appears on `/blog` list
- Click post card → navigate to `/blog/:slug` detail page
- Verify view count increments
- Verify tag filtering works via `?tag=` param
- Verify nav bar shows "博客" link for all users and "写文章" link for admin
