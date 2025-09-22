import { TaxRate, TipConfiguration } from '../types/index'

interface SettingsSectionProps {
  taxRates: TaxRate[]
  tipConfig: TipConfiguration
  onAddTaxRate: () => void
  onRemoveTaxRate: (taxId: number) => void
  onUpdateTaxRate: (taxId: number, field: keyof TaxRate, value: string | number) => void
  onUpdateTipConfig: (isPercentage: boolean, value: number) => void
  formatCurrency: (amount: number) => string
}

const SettingsSection = ({
  taxRates,
  tipConfig,
  onAddTaxRate,
  onRemoveTaxRate,
  onUpdateTaxRate,
  onUpdateTipConfig,
  formatCurrency
}: SettingsSectionProps) => {
  const handleTipToggle = (isPercentage: boolean) => {
    onUpdateTipConfig(isPercentage, tipConfig.value)
  }

  const handleTipValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateTipConfig(tipConfig.isPercentage, parseFloat(e.target.value) || 0)
  }

  return (
    <div className="settings-compact">
      <div className="tax-section">
        <div className="subsection-header">
          <span>Tax Rates</span>
          <button type="button" onClick={onAddTaxRate} className="btn btn-ghost btn-sm">
            + Add
          </button>
        </div>

        <div className="tax-list">
          {taxRates.map(tax => (
            <div key={tax.id} className="tax-item">
              <input
                type="text"
                value={tax.name}
                onChange={(e) => onUpdateTaxRate(tax.id, 'name', e.target.value)}
                placeholder="Tax Name"
                className="tax-name-input"
              />
              <div className="tax-rate-input">
                <input
                  type="number"
                  value={formatCurrency(tax.rate)}
                  step="0.01"
                  min="0"
                  max="100"
                  onChange={(e) => onUpdateTaxRate(tax.id, 'rate', parseFloat(e.target.value))}
                  className="rate-input"
                />
                <span>%</span>
              </div>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => onRemoveTaxRate(tax.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="tip-section">
        <div className="subsection-header">
          <span>Tip</span>
        </div>

        <div className="tip-toggle-compact">
          <button
            type="button"
            className={`toggle-btn ${tipConfig.isPercentage ? 'active' : ''}`}
            onClick={() => handleTipToggle(true)}
          >
            %
          </button>
          <button
            type="button"
            className={`toggle-btn ${!tipConfig.isPercentage ? 'active' : ''}`}
            onClick={() => handleTipToggle(false)}
          >
            $
          </button>
        </div>

        <div className="tip-input-row">
          <input
            type="number"
            value={formatCurrency(tipConfig.value)}
            step="0.01"
            min="0"
            max={tipConfig.isPercentage ? "100" : undefined}
            onChange={handleTipValueChange}
            className="tip-value-input"
          />
          <span className="tip-unit">{tipConfig.isPercentage ? '%' : '$'}</span>
        </div>
      </div>
    </div>
  )
}

export default SettingsSection