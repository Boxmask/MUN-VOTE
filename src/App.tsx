import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Display } from './pages/Display'
import { Guide } from './pages/Guide'
import { Home } from './pages/Home'
import { Host } from './pages/Host'
import { Join } from './pages/Join'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/:seed" element={<Host />} />
        <Route path="/display/:seed" element={<Display />} />
        <Route path="/join/:seed" element={<Join />} />
        <Route path="/guide" element={<Guide />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
