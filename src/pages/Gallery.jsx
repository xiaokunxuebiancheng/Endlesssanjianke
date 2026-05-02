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

  const prev = () => setCurrent(c => (c === 0 ? images.length - 1 : c - 1))
  const next = () => setCurrent(c => (c === images.length - 1 ? 0 : c + 1))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, current])

  const getPreview = (offset) => {
    const idx = (current + offset + images.length) % images.length
    return images[idx]
  }

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
          {/* Main carousel — peek effect */}
          <div className="relative overflow-hidden rounded-3xl h-[60vh] flex items-center">
            {/* Prev peek */}
            {images.length > 1 && (
              <div
                className="absolute left-0 w-[15%] h-[80%] rounded-2xl overflow-hidden opacity-30 blur-[1px] cursor-pointer z-0 border border-white/[0.06]"
                onClick={prev}
              >
                <img
                  src={getUrl(getPreview(-1).name)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Current */}
            <div className="relative z-10 mx-auto w-[68%] h-[90%] transition-all duration-500 ease-out">
              <div className="liquid-glass rounded-3xl p-2 w-full h-full">
                <img
                  src={getUrl(images[current].name)}
                  alt=""
                  className="w-full h-full object-contain rounded-2xl"
                />
              </div>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(images[current].name)}
                  className="absolute top-5 right-5 p-2.5 rounded-xl bg-black/30 text-white/40 hover:text-red-400 hover:bg-black/50 transition-all z-30"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Next peek */}
            {images.length > 1 && (
              <div
                className="absolute right-0 w-[15%] h-[80%] rounded-2xl overflow-hidden opacity-30 blur-[1px] cursor-pointer z-0 border border-white/[0.06]"
                onClick={next}
              >
                <img
                  src={getUrl(getPreview(1).name)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Left Arrow — always visible */}
            {images.length > 1 && (
              <button onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full liquid-glass text-white hover:text-white transition-colors">
                <ChevronLeft size={22} />
              </button>
            )}

            {/* Right Arrow — always visible */}
            {images.length > 1 && (
              <button onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full liquid-glass text-white hover:text-white transition-colors">
                <ChevronRight size={22} />
              </button>
            )}
          </div>

          {/* Bottom thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center justify-center gap-3 mt-6">
              {images.map((img, i) => (
                <button
                  key={img.name}
                  onClick={() => setCurrent(i)}
                  className={`shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === current
                      ? 'border-white scale-110'
                      : 'border-transparent opacity-40 hover:opacity-70'
                  }`}
                >
                  <img src={getUrl(img.name)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
