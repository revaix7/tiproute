import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import ChooseTrip from './pages/ChooseTrip'
import CustomPlanner from './pages/CustomPlanner'
import Planner from './pages/Planner'
import Results from './pages/Results'
import TripCard from './pages/TripCard'
import NotFound from './pages/NotFound'
import Navbar from './components/Navbar'
import ScrollToTop from './components/ScrollToTop'
import PageErrorBoundary from './components/PageErrorBoundary'

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Navbar />
      <PageErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start" element={<ChooseTrip />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/custom" element={<CustomPlanner />} />
          <Route path="/results" element={<Results />} />
          <Route path="/trip-card" element={<TripCard />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </PageErrorBoundary>
    </BrowserRouter>
  )
}
