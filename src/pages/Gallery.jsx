import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, Trash2, Image, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Gallery() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [current, setCurrent] = useState(0)
  const fileRef = useRef(null)

  const isAdmin = user?.email === '1375937000@qq.com'

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    fetchImages()
  }, [])

  const fetchImages = async () => {
    const { data } = await supabase
      .storage.from('gallery')
      .list('', { sortBy: { column: 'created_at', order: 'desc' } })
    setImages(data?.filter(f => !f.name.startsWith('.')) || [])
    setLoading(false)
  }

  const handleUpload = async (e) => {
    const files = e.target.files
    if (!files?.length) return

    setUploading(true)
    for (const file of files) {
      const name = Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      await supabase.storage.from('gallery').upload(name, file)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    fetchImages()
  }

  const handleDelete = async (name) => {
    await supabase.storage.from('gallery').remove([name])
    if (current >= images.length - 1) setCurrent(Math.max(0, current - 1))
    fetchImages()
  }

  const getUrl = (name) => {
    const { data } = supabase.storage.from('gallery').getPublicUrl(name)
    return data.publicUrl
  }

  const prev = () => setCurrent(c => Math.max(0, c - 1))
  const next = () => setCurrent(c => Math.min(images.length - 1, c + 1))

  // Keyboard nav
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length])

  return (
    <div className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">画廊</h1>
        {isAdmin && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50 transition-colors">
              <Upload size={16} />
              {uploading ? '上传中...' : '上传图片'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-white/40 text-sm">加载中...</div>
      ) : images.length === 0 ? (
        <div className="liquid-glass rounded-3xl p-20 text-center text-white/40">
          <Image size={48} className="mx-auto mb-4 opacity-20" />
          {isAdmin ? '点击右上角上传第一张图片' : '暂无图片'}
        </div>
      ) : (
        <div className="relative">
          {/* Carousel */}
          <div className="overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${current * 100}%)` }}
            >
              {images.map(img => (
                <div key={img.name} className="w-full shrink-0 relative">
                  <img
                    src={getUrl(img.name)}
                    alt=""
                    className="w-full h-[65vh] object-contain bg-black/20"
                  />
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(img.name)}
                      className="absolute top-3 right-3 p-2.5 rounded-xl bg-black/30 text-white/40 hover:text-red-400 hover:bg-black/50 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Arrows */}
          {images.length > 1 && (
            <>
              {current > 0 && (
                <button onClick={prev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-3 rounded-full liquid-glass text-white/80 hover:text-white transition-colors">
                  <ChevronLeft size={24} />
                </button>
              )}
              {current < images.length - 1 && (
                <button onClick={next}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-3 rounded-full liquid-glass text-white/80 hover:text-white transition-colors">
                  <ChevronRight size={24} />
                </button>
              )}
            </>
          )}

          {/* Dots */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {images.map((_, i) => (
                <button key={i} onClick={() => setCurrent(i)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i === current ? 'bg-white' : 'bg-white/20 hover:bg-white/40'
                  }`} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
