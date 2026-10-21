import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { countries, transportModes } from '../data/countries'
import {
  calculateTrip,
  compareEstimates,
  compareTransportModes,
  DIFFICULTY_LABELS,
} from '../data/tripCalculator'
import { findTrip, DEFAULT_DAILY_BUDGET } from '../data/tripFinder'
import TransportPicker from '../components/TransportPicker'
import BudgetSlider from '../components/BudgetSlider'

// Long enough to walk the longest route at the slowest pace
const MAX_TRIP_DAYS = Math.ceil(
  Math.max(...countries.map((c) => c.tipToTip.distanceKm)) /
    Math.min(...transportModes.map((t) => t.kmPerDay.min))
)

// Total money for "Find me a trip", transport and living costs together
const TOTAL_BUDGET = { min: 100, max: 20000, step: 100, initial: 2000 }

const PLANNING_MODES = [
  { id: 'route', label: 'I have a route' },
  { id: 'time', label: 'I have time' },
  { id: 'find', label: 'Find me a trip' },
]

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
  const [planningMode, setPlanningMode] = useState(
    PLANNING_MODES.some((m) => m.id === saved.planningMode) ? saved.planningMode : 'route'
  )
  const [selectedCountry, setSelectedCountry] = useState(
    countries.find((c) => c.code === saved.countryCode) ?? null
  )
  const [selectedTransport, setSelectedTransport] = useState(
    transportModes.find((t) => t.id === saved.transportId) ?? transportModes[0]
  )
  const [dailyBudget, setDailyBudget] = useState(inRange(saved.dailyBudget, 5, 150) ? saved.dailyBudget : 30)
  const [tripDays, setTripDays] = useState(inRange(saved.tripDays, 1, MAX_TRIP_DAYS) ? saved.tripDays : 14)
  const [totalBudget, setTotalBudget] = useState(
    inRange(saved.totalBudget, TOTAL_BUDGET.min, TOTAL_BUDGET.max) ? saved.totalBudget : TOTAL_BUDGET.initial
  )
  const [maxDifficulty, setMaxDifficulty] = useState(
    DIFFICULTY_LABELS.includes(saved.maxDifficulty) ? saved.maxDifficulty : 'Challenging'
  )

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
          totalBudget,
          maxDifficulty,
        })
      )
    } catch {
      // Storage unavailable: the planner still works, it just won't remember
    }
  }, [planningMode, selectedCountry, selectedTransport, dailyBudget, tripDays, totalBudget, maxDifficulty])

  // "Find me a trip": a start and an end on the route that fit the days, money and difficulty
  const handleFind = () => {
    const { found, trip, problems } = findTrip({
      country: selectedCountry,
      transportMode: selectedTransport,
      days: tripDays,
      budget: totalBudget,
      difficulty: maxDifficulty,
    })
    const comparison = compareEstimates({
      distanceKm: trip.distance,
      transportModes,
      dailyBudget: DEFAULT_DAILY_BUDGET,
    })
    const finder = { found, problems: problems ?? [], days: tripDays, budget: totalBudget, difficulty: maxDifficulty }
    navigate('/results', { state: { trip: { ...trip, finder }, comparison } })
  }

  const handlePlan = () => {
    if (!selectedCountry) return
    if (planningMode === 'find') return handleFind()

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
        {PLANNING_MODES.map((m) => (
          <button
            key={m.id}
            className={`mode-btn ${planningMode === m.id ? 'active' : ''}`}
            onClick={() => setPlanningMode(m.id)}
          >
            {m.label}
          </button>
        ))}
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

        {/* Budget Slider ("Find me a trip" asks for the total instead) */}
        {planningMode !== 'find' && (
          <div className="planner-section">
            <h2>Daily Budget (Living Costs)</h2>
            <p className="section-note">Food, accommodation, misc — not transport</p>
            <BudgetSlider value={dailyBudget} onChange={setDailyBudget} />
          </div>
        )}

        {planningMode === 'find' && (
          <div className="planner-section">
            <h2>Total Budget</h2>
            <p className="section-note">
              Everything: transport, plus ${DEFAULT_DAILY_BUDGET} a day for food and a bed
            </p>
            <div className="slider-container">
              <input
                type="range"
                min={TOTAL_BUDGET.min}
                max={TOTAL_BUDGET.max}
                step={TOTAL_BUDGET.step}
                value={totalBudget}
                onChange={(e) => setTotalBudget(Number(e.target.value))}
                className="budget-slider"
                aria-label="Total budget"
              />
              <div className="slider-value">${totalBudget.toLocaleString()}</div>
              <div className="slider-labels">
                <span>${TOTAL_BUDGET.min}</span>
                <span>${TOTAL_BUDGET.max.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {planningMode === 'find' && (
          <div className="planner-section">
            <h2>How Hard?</h2>
            <p className="section-note">The hardest trip you are up for</p>
            <div className="difficulty-picker">
              {DIFFICULTY_LABELS.map((label) => (
                <button
                  key={label}
                  className={`difficulty-option ${maxDifficulty === label ? 'selected' : ''}`}
                  onClick={() => setMaxDifficulty(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trip Length ("I have time" and "Find me a trip") */}
        {planningMode !== 'route' && (
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
          {!selectedCountry
            ? 'Select a Country First'
            : planningMode === 'find'
              ? `Find a Trip: ${selectedCountry.name}`
              : `Plan the Trip: ${selectedCountry.name}`}
        </button>
      </div>
    </div>
  )
}
