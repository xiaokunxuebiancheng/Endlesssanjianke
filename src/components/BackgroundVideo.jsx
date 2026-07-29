export default function Background() {
  return (
    <>
      <div className="fixed inset-0 z-[0] bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950" />
      <div className="fixed inset-0 z-[0] opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 70% 80%, rgba(255,255,255,0.3) 0%, transparent 50%)',
        }} />
    </>
  )
}
