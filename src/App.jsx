import { Music2, MessageCircle, AtSign, Video, Share2 } from 'lucide-react'
import { motion } from 'motion/react'

const discoverLinks = ['Labs & Workshops', 'Deep Dive Series', 'Global Circle', 'Resource Vault', 'Future Roadmap']
const missionLinks = ['Origin Story', 'The Collective', 'Newsroom Hub', 'Join the Team']
const conciergeLinks = ['Get in Touch', 'Legal Privacy', 'User Agreement', 'Report Concern']

const socialIcons = [
  { Icon: Music2, href: '#' },
  { Icon: MessageCircle, href: '#' },
  { Icon: AtSign, href: '#' },
  { Icon: Video, href: '#' },
  { Icon: Share2, href: '#' },
]

function App() {
  return (
    <main className="relative w-full min-h-[115vh] overflow-x-hidden flex flex-col items-center font-sans selection:bg-white/20 selection:text-white">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_114316_1c7889ad-2885-410e-b493-98119fee0ddb.mp4"
      />

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-7xl flex flex-col items-center px-4 md:px-6">
        {/* Upper CTA Placeholder — pushes footer down */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="text-5xl md:text-7xl font-bold text-white tracking-tight"
          >
            Explore the Universe
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
            className="mt-6 text-lg md:text-xl text-white/60 max-w-xl"
          >
            Premium clarity on global events and cosmic wonders &mdash; shared with all for free.
          </motion.p>
        </div>

        {/* Liquid Glass Footer */}
        <motion.footer
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
          className="liquid-glass w-full rounded-3xl p-6 md:p-10 text-white/70 mt-32 md:mt-64"
        >
          {/* Top Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 mb-10">
            {/* Brand Column */}
            <div className="md:col-span-5">
              <div className="flex items-center gap-2 text-white mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 256 256" fill="currentColor">
                  <path d="M 4.688 136 C 68.373 136 120 187.627 120 251.312 C 120 252.883 119.967 254.445 119.905 256 L 0 256 L 0 136.096 C 1.555 136.034 3.117 136 4.688 136 Z M 251.312 136 C 252.883 136 254.445 136.034 256 136.096 L 256 256 L 136.095 256 C 136.032 254.438 136.001 252.875 136 251.312 C 136 187.627 187.627 136 251.312 136 Z M 119.905 0 C 119.967 1.555 120 3.117 120 4.688 C 120 68.373 68.373 120 4.687 120 C 3.117 120 1.555 119.967 0 119.905 L 0 0 Z M 256 119.905 C 254.445 119.967 252.883 120 251.312 120 C 187.627 120 136 68.373 136 4.687 C 136 3.117 136.033 1.555 136.095 0 L 256 0 Z" />
                </svg>
                <span className="text-xl font-medium text-white">LUMINA</span>
              </div>
              <p className="text-sm leading-relaxed max-w-sm">
                Lumina provides premium clarity on global events and cosmic wonders &mdash; shared with all for free.
              </p>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 grid grid-cols-3 gap-8">
              {/* Discover */}
              <div>
                <h4 className="text-sm uppercase tracking-wider text-white font-medium mb-4">Discover</h4>
                <ul className="space-y-2">
                  {discoverLinks.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
              {/* The Mission */}
              <div>
                <h4 className="text-sm uppercase tracking-wider text-white font-medium mb-4">The Mission</h4>
                <ul className="space-y-2">
                  {missionLinks.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
              {/* Concierge */}
              <div>
                <h4 className="text-sm uppercase tracking-wider text-white font-medium mb-4">Concierge</h4>
                <ul className="space-y-2">
                  {conciergeLinks.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            <p className="text-[10px] uppercase tracking-widest opacity-50">
              Curated by @GotInGeorgiG
            </p>
            <div className="flex items-center gap-4">
              <span className="text-[10px] uppercase tracking-widest opacity-50">
                Join the Journey:
              </span>
              <div className="flex items-center gap-3">
                {socialIcons.map(({ Icon, href }) => (
                  <a
                    key={href}
                    href={href}
                    className="opacity-70 hover:opacity-100 transition-colors hover:text-white"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </motion.footer>
      </div>
    </main>
  )
}

export default App
