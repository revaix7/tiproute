import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { countries, transportModes } from '../data/countries'
import { calculateTrip, compareTransportModes } from '../data/tripCalculator'
import TransportPicker from '../components/TransportPicker'
import BudgetSlider from '../components/BudgetSlider'

// Long enough to walk the longest route at the slowest pace
const MAX_TRIP_DAYS = Math.ceil(
  Math.max(...countries.map((c) => c.tipToTip.distanceKm)) /
    Math.min(...transportModes.map((t) => t.kmPerDay.min))
)

const STORAGE_KEY = 'tiproute.planner'

// Choices from the last visit in this tab, so coming back doesn't reset the planner
function loadSavedChoices() {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) ?? {}
  } catch {
    return {}
  }
}

const inRange = (value, min, max) => Number.isInteger(value) && value >= min && value <= max

export default function Planner() {
  const navigate = useNavigate()
  const [saved] = useState(loadSavedChoices)
  const [planningMode, setPlanningMode] = useState(saved.planningMode === 'time' ? 'time' : 'route') // 'route' or 'time'
  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((c) => c.code === saved.countryCode) ?? null
  )
  const [selectedTransport, setSelectedTransport] = useState(
    transportModes.find((t) => t.id === saved.transportId) ?? transportModes[0]
  )
  const [dailyBudget, setDailyBudget] = useState(inRange(saved.dailyBudget, 5, 150) ? saved.dailyBudget : 30)
  const [tripDays, setTripDays] = useState(inRange(saved.tripDays, 1, MAX_TRIP_DAYS) ? saved.tripDays : 14)

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          planningMode,
          countryCode: selectedCountry?.code ?? null,
          transportId: selectedTransport.id,
          dailyBudget,
          tripDays,
        })
      )
    } catch {
      // Storage unavailable: the planner still works, it just won't remember
    }
  }, [planningMode, selectedCountry, selectedTransport, dailyBudget, tripDays])

  const handlePlan = () => {
    if (!selectedCountry) return

    const result = calculateTrip({
      country: selectedCountry,
      transportMode: selectedTransport,
      dailyBudget,
      planningMode,
      tripDays,
    })

    const comparison = compareTransportModes({
      country: selectedCountry,
      transportModes,
      dailyBudget,
      planningMode,
      tripDays,
    })

    navigate('/results', { state: { trip: result, comparison } })
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
          I have a route
        </button>
        <button
          className={`mode-btn ${planningMode === 'time' ? 'active' : ''}`}
          onClick={() => setPlanningMode('time')}
        >
          I have time
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
          <TransportPicker selected={selectedTransport} onSelect={setSelectedTransport} />
        </div>

        {/* Budget Slider */}
        <div className="planner-section">
          <h2>Daily Budget (Living Costs)</h2>
          <p className="section-note">Food, accommodation, misc — not transport</p>
          <BudgetSlider value={dailyBudget} onChange={setDailyBudget} />
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
