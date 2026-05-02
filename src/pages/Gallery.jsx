import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, X, Trash2, Image, ChevronLeft, ChevronRight } from 'lucide-react'

export default function Gallery() {
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(-1)
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
    fetchImages()
  }

  const getUrl = (name) => {
    const { data } = supabase.storage.from('gallery').getPublicUrl(name)
    return data.publicUrl
  }

  return (
    <div className="py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">画廊</h1>
        {isAdmin && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 disabled:opacity-50 transition-colors"
            >
              <Upload size={16} />
              {uploading ? '上传中...' : '上传图片'}
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-white/40 text-sm">加载中...</div>
      ) : images.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center text-white/40">
          <Image size={40} className="mx-auto mb-3 opacity-30" />
          {isAdmin ? '点击右上角上传第一张图片' : '暂无图片'}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map(img => (
            <div key={img.name} className="group relative liquid-glass rounded-2xl overflow-hidden aspect-square cursor-pointer"
              onClick={() => setLightboxIdx(i)}>
              <img
                src={getUrl(img.name)}
                alt=""
                loading="lazy"
                className="w-full h-full object-cover"
              />
              {isAdmin && (
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(img.name) }}
                  className="absolute top-2 right-2 p-2 rounded-lg bg-black/40 text-white/60 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightboxIdx >= 0 && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onKeyDown={e => {
            if (e.key === 'Escape') setLightboxIdx(-1)
            if (e.key === 'ArrowLeft') setLightboxIdx(i => Math.max(0, i - 1))
            if (e.key === 'ArrowRight') setLightboxIdx(i => Math.min(images.length - 1, i + 1))
          }}
          tabIndex={0}>

          {/* Close */}
          <button onClick={() => setLightboxIdx(-1)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 text-white/60 hover:text-white transition-colors">
            <X size={24} />
          </button>

          {/* Counter */}
          <span className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/40 text-white/60 text-xs">
            {lightboxIdx + 1} / {images.length}
          </span>

          {/* Prev */}
          {lightboxIdx > 0 && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => i - 1) }}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-colors">
              <ChevronLeft size={28} />
            </button>
          )}

          {/* Image */}
          <img
            src={getUrl(images[lightboxIdx].name)}
            alt=""
            className="max-w-full max-h-[90vh] object-contain rounded-xl select-none"
            onClick={e => e.stopPropagation()}
          />

          {/* Next */}
          {lightboxIdx < images.length - 1 && (
            <button onClick={e => { e.stopPropagation(); setLightboxIdx(i => i + 1) }}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-black/40 text-white/60 hover:text-white hover:bg-black/60 transition-colors">
              <ChevronRight size={28} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
