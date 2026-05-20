import { useEffect, useRef } from 'react'

export default function BackgroundVideo({ src }) {
  const aRef = useRef(null)
  const bRef = useRef(null)
  const currentRef = useRef('a')

  useEffect(() => {
    const a = aRef.current
    const b = bRef.current
    let current = a
    let standby = b
    let swapping = false

    a.play()

    const swap = () => {
      if (swapping) return
      swapping = true
      current.style.opacity = '0'
      standby.style.opacity = '1'
      standby.currentTime = 0
      standby.play()
      const prev = current
      current = standby
      standby = prev
      currentRef.current = current === a ? 'a' : 'b'
      swapping = false
    }

    const onTimeUpdate = () => {
      const remaining = current.duration - current.currentTime
      if (remaining < 1.2 && standby.paused) {
        standby.currentTime = 0
        standby.play().catch(() => {})
      }
    }

    const onEnded = () => {
      if (!standby.paused) {
        swap()
      } else {
        current.currentTime = 0
        current.play().catch(() => {})
      }
    }

    a.addEventListener('timeupdate', onTimeUpdate)
    b.addEventListener('timeupdate', onTimeUpdate)
    a.addEventListener('ended', onEnded)
    b.addEventListener('ended', onEnded)

    return () => {
      a.removeEventListener('timeupdate', onTimeUpdate)
      b.removeEventListener('timeupdate', onTimeUpdate)
      a.removeEventListener('ended', onEnded)
      b.removeEventListener('ended', onEnded)
    }
  }, [src])

  return (
    <>
      <video
        ref={aRef}
        muted
        playsInline
        preload="auto"
        src={src}
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        style={{ opacity: 1 }}
      />
      <video
        ref={bRef}
        muted
        playsInline
        preload="auto"
        src={src}
        className="fixed inset-0 w-full h-full object-cover z-[0] transition-opacity duration-700"
        style={{ opacity: 0 }}
      />
    </>
  )
}
