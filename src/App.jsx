import { Routes, Route } from 'react-router-dom'
import BlogLayout from './components/BlogLayout.jsx'
import Home from './pages/Home.jsx'
import Article from './pages/Article.jsx'
import Links from './pages/Links.jsx'
import Guestbook from './pages/Guestbook.jsx'
import Login from './pages/Login.jsx'

export default function App() {
  return (
    <>
      {/* Video Background — shared across all pages */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_114316_1c7889ad-2885-410e-b493-98119fee0ddb.mp4"
      />

      <Routes>
        <Route element={<BlogLayout />}>
          <Route index element={<Home />} />
          <Route path="article/:slug" element={<Article />} />
          <Route path="links" element={<Links />} />
          <Route path="guestbook" element={<Guestbook />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </>
  )
}
