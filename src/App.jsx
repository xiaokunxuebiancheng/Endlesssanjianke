import { Routes, Route } from 'react-router-dom'
import BlogLayout from './components/BlogLayout.jsx'
import BackgroundVideo from './components/BackgroundVideo.jsx'
import ChatBubble from './components/ChatBubble.jsx'
import Home from './pages/Home.jsx'

import Guestbook from './pages/Guestbook.jsx'
import About from './pages/About.jsx'
import Gallery from './pages/Gallery.jsx'
import BlogList from './pages/BlogList.jsx'
import BlogPost from './pages/BlogPost.jsx'
import AdminWrite from './pages/AdminWrite.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import Login from './pages/Login.jsx'
import Plans from './pages/Plans.jsx'
import ReadingNotes from './pages/ReadingNotes.jsx'

export default function App() {
  return (
    <>
      <BackgroundVideo />

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
          <Route path="plans" element={<Plans />} />
          <Route path="reading" element={<ReadingNotes />} />
          <Route path="login" element={<Login />} />
        </Route>
      </Routes>

      <ChatBubble />
    </>
  )
}
