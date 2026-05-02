import { Routes, Route } from 'react-router-dom'
import BlogLayout from './components/BlogLayout.jsx'
import Home from './pages/Home.jsx'

import Guestbook from './pages/Guestbook.jsx'
import About from './pages/About.jsx'
import Login from './pages/Login.jsx'

export default function App() {
  return (
    <>
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260417_061226_74f0749c-a22d-42b3-895e-5d6203bc741c.mp4"
      />

      <Routes>
        <Route element={<BlogLayout />}>
          <Route index element={<Home />} />

          <Route path="guestbook" element={<Guestbook />} />
          <Route path="about" element={<About />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </>
  )
}
