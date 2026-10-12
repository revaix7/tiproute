import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { countries, transportModes } from '../data/countries'
import { calculateTrip } from '../data/tripCalculator'

// Long enough to walk the longest route at the slowest pace
const MAX_TRIP_DAYS = Math.ceil(
  Math.max(...countries.map((c) => c.tipToTip.distanceKm)) /
    Math.min(...transportModes.map((t) => t.kmPerDay.min))
)

export default function Planner() {
  const navigate = useNavigate()
  const [planningMode, setPlanningMode] = useState('route') // 'route' or 'time'
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [selectedTransport, setSelectedTransport] = useState(transportModes[0])
  const [dailyBudget, setDailyBudget] = useState(30)
  const [tripDays, setTripDays] = useState(14)

  const handlePlan = () => {
    if (!selectedCountry) return

    const result = calculateTrip({
      country: selectedCountry,
      transportMode: selectedTransport,
      dailyBudget,
      planningMode,
      tripDays,
    })

    navigate('/results', { state: { trip: result } })
  }

  return (
    <div className="planner">
      <div className="planner-header">
        <h1>Plan Your Adventure</h1>
        <p>Choose your challenge. We'll do the math.</p>
      </div>

      {/* Planning Mode Toggle */}
      <div className="mode-toggle">
        <button
          className={`mode-btn ${planningMode === 'route' ? 'active' : ''}`}
          onClick={() => setPlanningMode('route')}
        >
          {'\u{1F4CD}'} I have a route
        </button>
        <button
          className={`mode-btn ${planningMode === 'time' ? 'active' : ''}`}
          onClick={() => setPlanningMode('time')}
        >
          {'\u{1F4C5}'} I have time
        </button>
      </div>

      <div className="planner-grid">
        {/* Country Selection */}
        <div className="planner-section">
          <h2>Pick Your Country</h2>
          <div className="country-grid">
            {countries.map((c) => (
              <button
                key={c.code}
                className={`country-card ${selectedCountry?.code === c.code ? 'selected' : ''}`}
                onClick={() => setSelectedCountry(c)}
              >
                <span className="country-name">{c.name}</span>
                <span className="country-distance">{c.tipToTip.distanceKm.toLocaleString()} km</span>
                <span className="country-route">
                  {c.tipToTip.start.name} {'\u2192'} {c.tipToTip.end.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Transport Mode */}
        <div className="planner-section">
          <h2>Choose Your Ride</h2>
          <div className="transport-grid">
            {transportModes.map((t) => (
              <button
                key={t.id}
                className={`transport-card ${selectedTransport.id === t.id ? 'selected' : ''}`}
                onClick={() => setSelectedTransport(t)}
              >
                <span className="transport-emoji">{t.emoji}</span>
                <span className="transport-name">{t.name}</span>
                <span className="transport-desc">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Budget Slider */}
        <div className="planner-section">
          <h2>Daily Budget (Living Costs)</h2>
          <p className="section-note">Food, accommodation, misc — not transport</p>
          <div className="slider-container">
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              className="budget-slider"
            />
            <div className="slider-value">${dailyBudget}/day</div>
            <div className="slider-labels">
              <span>Survival ($5)</span>
              <span>Comfortable ($150)</span>
            </div>
          </div>
        </div>

        {/* Trip Length (only in "I have time" mode) */}
        {planningMode === 'time' && (
          <div className="planner-section">
            <h2>How Many Days?</h2>
            <div className="slider-container">
              <input
                type="range"
                min="1"
                max={MAX_TRIP_DAYS}
                step="1"
                value={tripDays}
                onChange={(e) => setTripDays(Number(e.target.value))}
                className="budget-slider"
              />
              <div className="slider-value">{tripDays} {tripDays === 1 ? 'day' : 'days'}</div>
              <div className="slider-labels">
                <span>Weekend (1)</span>
                <span>Long Haul ({MAX_TRIP_DAYS})</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Plan Button */}
      <div className="plan-action">
        <button
          className="cta-button plan-button"
          onClick={handlePlan}
          disabled={!selectedCountry}
        >
          {selectedCountry
            ? `Plan the Trip: ${selectedCountry.name}`
            : 'Select a Country First'}
        </button>
      </div>
    </div>
  )
}
