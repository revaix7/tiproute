import { Link } from 'react-router-dom'

const choices = [
  {
    to: '/planner',
    title: 'Pre-planned trip',
    text: 'Pick a country and we take you from one tip to the other.',
  },
  {
    to: '/custom',
    title: 'Plan your own trip',
    text: 'Pick any start and end on the map and we estimate the rest.',
  },
]

export default function ChooseTrip() {
  return (
    <div className="choose-trip">
      <div className="planner-header">
        <h1>How Do You Want to Go?</h1>
        <p>Follow one of our routes, or make your own.</p>
      </div>

      <div className="choice-grid">
        {choices.map((choice, i) => (
          <Link key={choice.to} to={choice.to} className="choice-card">
            <span className="feature-number">{String(i + 1).padStart(2, '0')}</span>
            <span className="choice-title">{choice.title}</span>
            <span className="choice-text">{choice.text}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
