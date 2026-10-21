// Trip calculation engine

// How long a trip of any distance takes and what it costs. Needs no country,
// so "plan your own trip" and the trip finder can use it too.
export function estimateTrip({ distanceKm, transportMode, dailyBudget }) {
  const mode = transportMode
  const minDays = Math.ceil(distanceKm / mode.kmPerDay.max)
  const maxDays = Math.ceil(distanceKm / mode.kmPerDay.min)
  const avgDays = Math.round((minDays + maxDays) / 2)

  const dailyTotalCost = mode.dailyCost + (distanceKm / avgDays) * mode.costPerKm + dailyBudget
  const totalBudget = dailyTotalCost * avgDays

  return {
    minDays,
    maxDays,
    avgDays,
    dailyCost: Math.round(dailyTotalCost),
    totalBudget: Math.round(totalBudget),
    difficulty: getDifficulty(mode.difficulty, distanceKm, avgDays),
  }
}

export function calculateTrip({ country, transportMode, dailyBudget, planningMode, tripDays }) {
  const distance = country.tipToTip.distanceKm
  const mode = transportMode

  if (planningMode === 'route') {
    // "I have a route" — calculate how many days
    const estimate = estimateTrip({ distanceKm: distance, transportMode, dailyBudget })
    const checkpoints = country.tipToTip.checkpoints

    return {
      startPoint: country.tipToTip.start.name,
      endPoint: country.tipToTip.end.name,
      start: country.tipToTip.start,
      end: country.tipToTip.end,
      country: country.name,
      distance,
      ...estimate,
      budgetPerDay: dailyBudget,
      checkpoints,
      transport: mode,
      planningMode,
      canComplete: true,
      reachableDistance: distance,
      reachableCheckpoint: checkpoints[checkpoints.length - 1],
    }
  } else {
    // "I have time" — calculate how far you can get
    const avgKmPerDay = (mode.kmPerDay.min + mode.kmPerDay.max) / 2
    const reachableDistance = Math.round(avgKmPerDay * tripDays)
    const canComplete = reachableDistance >= distance

    // Figure out which checkpoint you'd reach
    const checkpoints = country.tipToTip.checkpoints
    const segmentLength = distance / (checkpoints.length - 1)
    const segmentsReachable = Math.min(
      Math.floor(reachableDistance / segmentLength),
      checkpoints.length - 1
    )
    const reachableCheckpoint = checkpoints[segmentsReachable]
    const reachedCheckpoints = checkpoints.slice(0, segmentsReachable + 1)

    // Transport costs stop once the route is finished; living costs cover every day
    const coveredDistance = Math.min(reachableDistance, distance)
    const travelDays = canComplete ? Math.ceil(distance / avgKmPerDay) : tripDays
    const transportCost = mode.dailyCost * travelDays + coveredDistance * mode.costPerKm
    const totalBudget = transportCost + dailyBudget * tripDays
    const dailyTotalCost = totalBudget / tripDays

    const difficulty = getDifficulty(mode.difficulty, coveredDistance, travelDays)

    return {
      startPoint: country.tipToTip.start.name,
      endPoint: country.tipToTip.end.name,
      start: country.tipToTip.start,
      end: country.tipToTip.end,
      country: country.name,
      distance,
      minDays: tripDays,
      maxDays: tripDays,
      avgDays: tripDays,
      dailyCost: Math.round(dailyTotalCost),
      totalBudget: Math.round(totalBudget),
      budgetPerDay: dailyBudget,
      difficulty,
      checkpoints: reachedCheckpoints,
      allCheckpoints: checkpoints,
      transport: mode,
      planningMode,
      canComplete,
      reachableDistance: coveredDistance,
      reachableCheckpoint,
    }
  }
}

// How much of the route a trip covers: all of it, or part of it for an unfinished
// "I have time" trip
export function routeProgress(trip) {
  const totalKm = trip.distance
  const coveredKm = trip.canComplete ? totalKm : trip.reachableDistance
  return { coveredKm, totalKm, percent: Math.round((coveredKm / totalKm) * 100) }
}

// "385 of 2,100 km (18%)", for the trip card and the share text
export function progressText(trip) {
  const { coveredKm, totalKm, percent } = routeProgress(trip)
  return `${coveredKm.toLocaleString()} of ${totalKm.toLocaleString()} km (${percent}%)`
}

// From easiest to hardest. A score of 1 is Easy, 5 is Extreme.
export const DIFFICULTY_LABELS = ['Easy', 'Moderate', 'Challenging', 'Hard', 'Extreme']

export function getDifficulty(baseDifficulty, distance, days) {
  // Scale: 1–5 based on transport difficulty, distance, and pace
  let score = baseDifficulty

  if (distance > 3000) score += 0.5
  if (distance > 5000) score += 0.5
  if (days > 60) score += 0.5
  if (days > 100) score += 0.5

  score = Math.min(5, Math.max(1, Math.round(score * 10) / 10))

  const label = DIFFICULTY_LABELS[Math.min(Math.floor(score) - 1, 4)]

  return { score, label }
}

// Run the same trip through every transport mode so they can be compared side by side
export function compareTransportModes({ country, transportModes, dailyBudget, planningMode, tripDays }) {
  const trips = transportModes.map((transportMode) =>
    calculateTrip({ country, transportMode, dailyBudget, planningMode, tripDays })
  )

  const cheapest = Math.min(...trips.map((t) => t.totalBudget))
  const fastest = Math.min(...trips.map((t) => t.avgDays))
  const farthest = Math.max(...trips.map((t) => t.reachableDistance))

  return trips.map((t) => ({
    id: t.transport.id,
    name: t.transport.name,
    emoji: t.transport.emoji,
    minDays: t.minDays,
    maxDays: t.maxDays,
    totalBudget: t.totalBudget,
    difficulty: t.difficulty,
    canComplete: t.canComplete,
    reachableDistance: t.reachableDistance,
    percentOfRoute: Math.round((t.reachableDistance / t.distance) * 100),
    isCheapest: t.totalBudget === cheapest,
    // With a fixed number of days every mode takes the same time, so rank by distance instead
    isFastest: planningMode === 'route' ? t.avgDays === fastest : t.reachableDistance === farthest,
  }))
}

// The same distance with every transport mode, for a trip with no country ("plan your own trip")
export function compareEstimates({ distanceKm, transportModes, dailyBudget }) {
  const estimates = transportModes.map((transportMode) => ({
    transportMode,
    ...estimateTrip({ distanceKm, transportMode, dailyBudget }),
  }))

  const cheapest = Math.min(...estimates.map((e) => e.totalBudget))
  const fastest = Math.min(...estimates.map((e) => e.avgDays))

  return estimates.map((e) => ({
    id: e.transportMode.id,
    name: e.transportMode.name,
    emoji: e.transportMode.emoji,
    minDays: e.minDays,
    maxDays: e.maxDays,
    totalBudget: e.totalBudget,
    difficulty: e.difficulty,
    isCheapest: e.totalBudget === cheapest,
    isFastest: e.avgDays === fastest,
  }))
}
