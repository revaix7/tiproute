import { transportModes } from '../data/countries'

// One card per way to travel; the selected one is highlighted
export default function TransportPicker({ selected, onSelect }) {
  return (
    <div className="transport-grid">
      {transportModes.map((t) => (
        <button
          key={t.id}
          className={`transport-card ${selected.id === t.id ? 'selected' : ''}`}
          onClick={() => onSelect(t)}
        >
          <span className="transport-emoji">{t.emoji}</span>
          <span className="transport-name">{t.name}</span>
          <span className="transport-desc">{t.description}</span>
        </button>
      ))}
    </div>
  )
}
