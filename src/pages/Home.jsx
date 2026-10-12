import { Link } from 'react-router-dom'

const features = [
  {
    title: 'Tip-to-Tip Mode',
    text: 'Pick a country. We auto-select the two most extreme points. You just survive the middle.',
  },
  {
    title: 'Choose Your Ride',
    text: 'Motorbike, bicycle, public transport, or your own two feet. Each changes everything.',
  },
  {
    title: 'Budget Reality Check',
    text: "Set your daily budget. We'll tell you if your dream trip is realistic or delusional.",
  },
  {
    title: 'Trip Card',
    text: "Get a shareable challenge card. Show your friends what you're about to attempt.",
  },
]

export default function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h1 className="hero-title">Tip to Tip</h1>
        <p className="hero-tagline">Two friends. One country. No maps. No rules.</p>
        <div className="hero-intro">
          <p className="hero-subtitle">
            The trip planner for people who want adventure over comfort.
            Pick your mode, your budget, your challenge — then figure out the rest yourself.
          </p>
          <Link to="/planner" className="cta-button">
            Plan Your Tip to Tip
          </Link>
        </div>
        <div className="hero-features">
          {features.map((feature, i) => (
            <div key={feature.title} className="feature-card">
              <span className="feature-number">{String(i + 1).padStart(2, '0')}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
