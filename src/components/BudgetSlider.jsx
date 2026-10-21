// Daily living budget, from $5 to $150 in steps of $5
export default function BudgetSlider({ value, onChange }) {
  return (
    <div className="slider-container">
      <input
        type="range"
        min="5"
        max="150"
        step="5"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="budget-slider"
      />
      <div className="slider-value">${value}/day</div>
      <div className="slider-labels">
        <span>Survival ($5)</span>
        <span>Comfortable ($150)</span>
      </div>
    </div>
  )
}
