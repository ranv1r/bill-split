import { useState } from 'react'
import { BillItem, TaxRate, TipConfiguration } from '../types/index'
import { User, ChevronDown, ChevronUp } from 'lucide-react'

interface SummarySectionProps {
  items?: BillItem[]
  people?: string[]
  taxRates?: TaxRate[]
  tipConfig?: TipConfiguration
  calculateItemTotal: (item: BillItem) => number
  calculateItemTotalPerPerson: (item: BillItem) => number
  calculateSubtotal: () => number
  getTipPercentage: () => number
  formatCurrency: (amount: number) => string
  selectedPerson?: string | null
}

const SummarySection = ({
  items,
  people,
  taxRates,
  tipConfig,
  calculateItemTotal,
  calculateItemTotalPerPerson,
  calculateSubtotal,
  getTipPercentage,
  formatCurrency,
  selectedPerson
}: SummarySectionProps) => {
  const [showPersonalBreakdown, setShowPersonalBreakdown] = useState(false)
  const summary: { [person: string]: number } = {}
  let totalSubtotal = 0
  const taxTotals: { [taxId: number]: number } = {}
  let totalTip = 0

  // Initialize tax totals
  if (taxRates) {
    taxRates.forEach(tax => {
      taxTotals[tax.id] = 0
    })
  }

  // Initialize summary for each person
  if (people) {
    people.forEach(person => {
      summary[person] = 0
    })
  }

  // Calculate each person's share and bill breakdown
  if (items) {
    items.forEach(item => {
      const subtotal = item.price
      totalSubtotal += subtotal

      // Calculate tax totals for each configured tax
      if (taxRates) {
        taxRates.forEach(tax => {
          if (item.applicableTaxes && item.applicableTaxes[tax.id]) {
            taxTotals[tax.id] += subtotal * (tax.rate / 100)
          }
        })
      }

      const totalPerPerson = calculateItemTotalPerPerson(item)
      if (item.assignedPeople) {
        item.assignedPeople.forEach(person => {
          summary[person] += totalPerPerson
        })
      }
    })
  }

  // Calculate tip on subtotal + taxes (same as calculateItemTotal logic)
  const totalTaxAmount = Object.values(taxTotals).reduce((a, b) => a + b, 0)
  const subtotalWithTax = totalSubtotal + totalTaxAmount
  const tipPercentage = getTipPercentage()
  totalTip = subtotalWithTax * (tipPercentage / 100)

  // Calculate grand total
  const grandTotal = subtotalWithTax + totalTip

  const taxBreakdown = taxRates.map(tax => {
    const total = taxTotals[tax.id]
    return total > 0 ? (
      <div key={tax.id} className="breakdown-row">
        <span>{tax.name} ({formatCurrency(tax.rate)}%):</span>
        <span>${formatCurrency(total)}</span>
      </div>
    ) : null
  }).filter(Boolean)

  // Get personal items for selected person
  const personalItems = selectedPerson ? items.filter(item =>
    item.assignedPeople.includes(selectedPerson)
  ) : []

  const personalTotal = selectedPerson ? summary[selectedPerson] || 0 : 0

  return (
    <div className="summary-compact">
      {selectedPerson && personalTotal > 0 && (
        <div className="personal-summary">
          <h3>
            <User size={16} />
            What I Owe
          </h3>
          <div className="personal-total">${formatCurrency(personalTotal)}</div>

          <div className="expandable-section">
            <button
              className="expand-toggle"
              onClick={() => setShowPersonalBreakdown(!showPersonalBreakdown)}
            >
              {showPersonalBreakdown ? (
                <>
                  <ChevronUp size={16} />
                  Hide details
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Show my items ({personalItems.length})
                </>
              )}
            </button>

            {showPersonalBreakdown && (
              <div className="personal-breakdown">
                {personalItems.map((item, index) => (
                  <div key={index} className="personal-item">
                    <div>
                      <div className="item-name-personal">{item.name}</div>
                      <div className="item-share">
                        Split {item.assignedPeople.length} way{item.assignedPeople.length > 1 ? 's' : ''}
                      </div>
                    </div>
                    <div>${formatCurrency(calculateItemTotalPerPerson(item))}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bill-total">
        <div className="total-amount">${formatCurrency(grandTotal)}</div>
        <div className="total-label">Total Bill</div>
      </div>

      <div className="breakdown-compact">
        <div className="breakdown-item">
          <span>Subtotal</span>
          <span>${formatCurrency(totalSubtotal)}</span>
        </div>
        {taxBreakdown}
        <div className="breakdown-item">
          <span>Tip</span>
          <span>${formatCurrency(totalTip)}</span>
        </div>
      </div>

      {Object.keys(summary).length > 0 && (
        <div className="people-summary">
          <div className="summary-header">Per Person</div>
          {Object.entries(summary).map(([person, amount]) => (
            <div key={person} className="person-row">
              <span className="person-name">{person}</span>
              <span className="person-amount">${formatCurrency(amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SummarySection