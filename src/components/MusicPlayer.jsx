import { useState, useRef, useEffect } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

const MUSIC_URL = '/music.mp3'

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('music_playing')
    // 不自动播放，等用户手动点击
    if (audioRef.current && saved === 'true') {
      audioRef.current.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }, [])

  const toggle = () => {
    if (!audioRef.current || !MUSIC_URL) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
      localStorage.setItem('music_playing', 'false')
    } else {
      audioRef.current.play().then(() => {
        setPlaying(true)
        localStorage.setItem('music_playing', 'true')
      }).catch(() => {})
    }
  }

  if (!MUSIC_URL) return null

  return (
    <>
      <audio ref={audioRef} src={MUSIC_URL} loop preload="auto" />
      <button
        onClick={toggle}
        title={playing ? '暂停音乐' : '播放音乐'}
        className="fixed bottom-6 right-6 z-50 p-3 rounded-full liquid-glass text-white/60 hover:text-white transition-colors"
      >
        {playing ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </button>
    </>
  )
}
