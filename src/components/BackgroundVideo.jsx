import { useEffect, useRef } from 'react'

export default function BackgroundVideo({ src }) {
  const aRef = useRef(null)
  const bRef = useRef(null)

  useEffect(() => {
    const a = aRef.current
    const b = bRef.current
    let current = a
    let standby = b
    let standbyPlaying = false
    let stopped = false

    a.play()

    const onTimeUpdate = () => {
      if (stopped) return
      const r = current.duration - current.currentTime

      // Start standby ~1.5s before current ends
      if (r < 1.5 && standby.paused) {
        standby.currentTime = 0
        standby.play().catch(() => {})
      }

      // Confirm standby has actually started rendering frames
      if (!standby.paused && standby.currentTime > 0.05) {
        standbyPlaying = true
      }

      // When current is about to finish and standby is live, swap instantly
      if (r < 0.15 && standbyPlaying) {
        standbyPlaying = false
        current.style.opacity = '0'
        standby.style.opacity = '1'

        // Prepare old current as next standby
        current.pause()
        current.currentTime = 0

        const tmp = current
        current = standby
        standby = tmp
      }
    }

    const onEnded = () => {
      if (stopped) return
      // Fallback: if standby somehow isn't playing, just reset current
      if (!standbyPlaying) {
        current.currentTime = 0
        current.play().catch(() => {})
      }
    }

    a.addEventListener('timeupdate', onTimeUpdate)
    b.addEventListener('timeupdate', onTimeUpdate)
    a.addEventListener('ended', onEnded)
    b.addEventListener('ended', onEnded)

    return () => {
      stopped = true
      a.removeEventListener('timeupdate', onTimeUpdate)
      b.removeEventListener('timeupdate', onTimeUpdate)
      a.removeEventListener('ended', onEnded)
      b.removeEventListener('ended', onEnded)
    }
  }, [src])

  return (
    <>
      <video ref={aRef} muted playsInline preload="auto" src={src}
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        style={{ opacity: 1 }} />
      <video ref={bRef} muted playsInline preload="auto" src={src}
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        style={{ opacity: 0 }} />
    </>
  )
}
