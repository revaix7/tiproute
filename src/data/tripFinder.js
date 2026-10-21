// Trip finder: the user gives a country, days, money, a difficulty and a way to travel,
// and this finds a start and an end on that country's route that fit.
//
// Budget choice: `budget` is the total for the whole trip, transport and living costs
// together. Living costs are `dailyBudget` per day, $30 by default like the planner, so
// the finder page only needs one money input. A page can still pass its own daily amount.
//
// "Longest" means the trip with the most days (it uses the most of the user's time).
// Ties go to the longer distance.

import { estimateTrip, getDifficulty, DIFFICULTY_LABELS } from './tripCalculator'
import { distanceBetween } from './geo'

// Roads are longer than a straight line between two checkpoints
export const ROAD_FACTOR = 1.3
export const DEFAULT_DAILY_BUDGET = 30

const difficultyLevel = (label) => DIFFICULTY_LABELS.indexOf(label)

// Every trip from one checkpoint to a later one, with its road distance and estimate
function possibleTrips(checkpoints, transportMode, dailyBudget) {
  // Road distance from the first checkpoint to each checkpoint, added up leg by leg
  const distanceFromFirst = [0]
  for (let i = 1; i < checkpoints.length; i++) {
    const leg = distanceBetween(checkpoints[i - 1], checkpoints[i]) * ROAD_FACTOR
    distanceFromFirst.push(distanceFromFirst[i - 1] + leg)
  }

  const trips = []
  for (let from = 0; from < checkpoints.length - 1; from++) {
    for (let to = from + 1; to < checkpoints.length; to++) {
      const distance = Math.round(distanceFromFirst[to] - distanceFromFirst[from])
      trips.push({
        start: checkpoints[from],
        end: checkpoints[to],
        checkpoints: checkpoints.slice(from, to + 1),
        distance,
        ...estimateTrip({ distanceKm: distance, transportMode, dailyBudget }),
      })
    }
  }
  return trips
}

const isLonger = (a, b) => a.avgDays > b.avgDays || (a.avgDays === b.avgDays && a.distance > b.distance)

// How far a trip is over each limit, as a share of that limit (0 means it fits)
function overshoot(trip, { days, budget, wantedLevel }) {
  return {
    time: Math.max(0, trip.avgDays / Math.max(days, 1) - 1),
    money: Math.max(0, trip.totalBudget / Math.max(budget, 1) - 1),
    difficulty: Math.max(0, difficultyLevel(trip.difficulty.label) - wantedLevel),
  }
}

function explainProblems(trip, over, { days, budget, difficulty, transportMode }) {
  const problems = []
  if (over.time > 0) {
    problems.push({
      limit: 'time',
      message: `Too little time: the closest trip needs about ${trip.avgDays} days and you have ${days}.`,
    })
  }
  if (over.money > 0) {
    problems.push({
      limit: 'money',
      message: `Too little money: it costs about $${trip.totalBudget.toLocaleString()} and you have $${budget.toLocaleString()}.`,
    })
  }
  if (over.difficulty > 0) {
    // The transport sets the lowest difficulty a trip can have, however short it is
    const easiest = getDifficulty(transportMode.difficulty, 0, 0).label
    problems.push({
      limit: 'difficulty',
      message:
        difficultyLevel(easiest) > difficultyLevel(difficulty)
          ? `Difficulty too low for this transport: travelling by ${transportMode.name.toLowerCase()} is always at least ${easiest}.`
          : `Too hard: this trip is ${trip.difficulty.label} and you asked for ${difficulty} at most.`,
    })
  }
  return problems
}

// Returns { found: true, trip } with the longest trip that fits all three limits, or
// { found: false, trip, problems } with the closest trip and the limits it breaks.
// `difficulty` is the hardest the user accepts, one of DIFFICULTY_LABELS.
export function findTrip({
  country,
  transportMode,
  days,
  budget,
  difficulty,
  dailyBudget = DEFAULT_DAILY_BUDGET,
}) {
  const wantedLevel = difficultyLevel(difficulty)
  if (wantedLevel === -1) throw new Error(`Unknown difficulty: ${difficulty}`)

  const limits = { days, budget, wantedLevel }
  const base = { country: country.name, transport: transportMode, budgetPerDay: dailyBudget }
  const trips = possibleTrips(country.tipToTip.checkpoints, transportMode, dailyBudget)

  const fitting = trips.filter((trip) => {
    const over = overshoot(trip, limits)
    return over.time === 0 && over.money === 0 && over.difficulty === 0
  })

  if (fitting.length > 0) {
    const longest = fitting.reduce((best, trip) => (isLonger(trip, best) ? trip : best))
    return { found: true, trip: { ...base, ...longest } }
  }

  // Nothing fits: take the trip that breaks the limits by the least
  const scored = trips.map((trip) => {
    const over = overshoot(trip, limits)
    return { trip, over, score: over.time + over.money + over.difficulty }
  })
  const closest = scored.reduce((best, s) =>
    s.score < best.score || (s.score === best.score && isLonger(s.trip, best.trip)) ? s : best
  )

  return {
    found: false,
    trip: { ...base, ...closest.trip },
    problems: explainProblems(closest.trip, closest.over, {
      days,
      budget,
      difficulty,
      transportMode,
    }),
  }
}
