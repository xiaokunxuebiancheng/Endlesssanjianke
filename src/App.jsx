import { Routes, Route } from 'react-router-dom'
import BlogLayout from './components/BlogLayout.jsx'
import Home from './pages/Home.jsx'

import Guestbook from './pages/Guestbook.jsx'
import About from './pages/About.jsx'
import Gallery from './pages/Gallery.jsx'
import BlogList from './pages/BlogList.jsx'
import BlogPost from './pages/BlogPost.jsx'
import AdminWrite from './pages/AdminWrite.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
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
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_171521_25968ba2-b594-4b32-aab7-f6b69398a6fa.mp4"
      />

      <Routes>
        <Route element={<BlogLayout />}>
          <Route index element={<Home />} />

          <Route path="guestbook" element={<Guestbook />} />
          <Route path="about" element={<About />} />
          <Route path="gallery" element={<Gallery />} />
          <Route path="blog" element={<BlogList />} />
          <Route path="blog/:slug" element={<BlogPost />} />
          <Route path="admin/write" element={<AdminWrite />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>
    </>
  )
}
