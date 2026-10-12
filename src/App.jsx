import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Planner from './pages/Planner'
import Results from './pages/Results'
import TripCard from './pages/TripCard'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/planner" element={<Planner />} />
        <Route path="/results" element={<Results />} />
        <Route path="/trip-card" element={<TripCard />} />
      </Routes>
    </BrowserRouter>
  )
}
