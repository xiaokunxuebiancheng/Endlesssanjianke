export default function Background() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        background: `
          radial-gradient(ellipse 80% 60% at 30% 20%, rgba(40,40,50,0.6) 0%, transparent 60%),
          radial-gradient(ellipse 60% 80% at 70% 70%, rgba(30,30,40,0.5) 0%, transparent 60%),
          #0a0a0a
        `,
      }}
    />
  )
}
