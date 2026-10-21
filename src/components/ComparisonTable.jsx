import { DIFFICULTY_COLORS } from './difficultyColors'

// Every way to travel side by side. With a fixed number of days (isTimeMode) it compares
// how far each one gets instead of how long it takes.
export default function ComparisonTable({ options, selectedId, isTimeMode = false }) {
  return (
    <div className="comparison-table">
      <div className="comparison-row comparison-head">
        <span>Transport</span>
        <span>{isTimeMode ? 'Distance' : 'Time'}</span>
        <span>Budget</span>
        <span>Difficulty</span>
      </div>
      {options.map((option) => (
        <div
          key={option.id}
          className={`comparison-row ${option.id === selectedId ? 'selected' : ''}`}
        >
          <span className="comparison-mode">
            <span className="comparison-emoji">{option.emoji}</span> {option.name}
            {option.isCheapest && <span className="comparison-tag">Cheapest</span>}
            {option.isFastest && (
              <span className="comparison-tag">{isTimeMode ? 'Farthest' : 'Fastest'}</span>
            )}
          </span>
          <span>
            {isTimeMode
              ? `${option.reachableDistance.toLocaleString()} km (${option.percentOfRoute}%)`
              : `${option.minDays}–${option.maxDays} days`}
          </span>
          <span>${option.totalBudget.toLocaleString()}</span>
          <span style={{ color: DIFFICULTY_COLORS[option.difficulty.label] }}>
            {option.difficulty.label}
          </span>
        </div>
      ))}
    </div>
  )
}
