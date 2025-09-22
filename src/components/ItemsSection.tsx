import { BillItem, TaxRate } from '../types/index'

interface ItemsSectionProps {
  items: BillItem[]
  people: string[]
  taxRates: TaxRate[]
  onAddManualItem: () => void
  onRemoveItem: (index: number) => void
  onUpdateItemProperty: (index: number, property: keyof BillItem, value: any) => void
  onUpdateItemTax: (itemIndex: number, taxId: number, isChecked: boolean) => void
  onTogglePersonForItem: (itemIndex: number, person: string, isChecked: boolean) => void
  calculateItemTotal: (item: BillItem) => number
  calculateItemTotalPerPerson: (item: BillItem) => number
  formatCurrency: (amount: number) => string
}

const ItemsSection = ({
  items,
  people,
  taxRates,
  onAddManualItem,
  onRemoveItem,
  onUpdateItemProperty,
  onUpdateItemTax,
  onTogglePersonForItem,
  calculateItemTotal,
  calculateItemTotalPerPerson,
  formatCurrency
}: ItemsSectionProps) => {
  const taxColumns = taxRates.length

  if (items.length === 0) {
    return (
      <div className="items-empty">
        <div className="empty-content">
          <h3>No items yet</h3>
          <p>Items will appear here after OCR processing or you can add them manually.</p>
          <button type="button" onClick={onAddManualItem} className="btn btn-primary">
            Add Manual Item
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="items-main">
      <div className="items-header">
        <h2>Bill Items ({items.length})</h2>
        <button type="button" onClick={onAddManualItem} className="btn btn-primary">
          + Add Item
        </button>
      </div>

      <div className="items-table-wrapper">
        <table className="items-table">
          <thead>
            <tr>
              <th className="item-name-col">Item Name</th>
              <th className="quantity-col">Qty</th>
              <th className="price-col">Price</th>
              {taxRates.map(tax => (
                <th key={tax.id} className="tax-col">{tax.name}</th>
              ))}
              <th className="people-col">Assigned To</th>
              <th className="total-col">Total</th>
              <th className="actions-col"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const itemTotal = calculateItemTotal(item)
              return (
                <tr key={index} className="item-row">
                  <td className="item-name-cell">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => onUpdateItemProperty(index, 'name', e.target.value)}
                      placeholder="Item name"
                      className="table-input item-name-input"
                    />
                  </td>
                  <td className="quantity-cell">
                    <input
                      type="number"
                      value={item.quantity}
                      min="1"
                      onChange={(e) => onUpdateItemProperty(index, 'quantity', parseInt(e.target.value))}
                      className="table-input quantity-input"
                    />
                  </td>
                  <td className="price-cell">
                    <div className="price-input-wrapper">
                      <span className="currency-symbol">$</span>
                      <input
                        type="number"
                        value={formatCurrency(item.price)}
                        step="0.01"
                        min="0"
                        onChange={(e) => onUpdateItemProperty(index, 'price', parseFloat(e.target.value))}
                        className="table-input price-input"
                      />
                    </div>
                  </td>
                  {taxRates.map(tax => (
                    <td key={tax.id} className="tax-cell">
                      <input
                        type="checkbox"
                        checked={item.applicableTaxes[tax.id] || false}
                        onChange={(e) => onUpdateItemTax(index, tax.id, e.target.checked)}
                        className="tax-checkbox"
                      />
                    </td>
                  ))}
                  <td className="people-cell">
                    <div className="people-assignment-inline">
                      {people.map(person => (
                        <label key={person} className="person-checkbox-inline">
                          <input
                            type="checkbox"
                            checked={item.assignedPeople.includes(person)}
                            onChange={(e) => onTogglePersonForItem(index, person, e.target.checked)}
                          />
                          <span className="person-name">{person}</span>
                        </label>
                      ))}
                      {item.assignedPeople.length > 0 && (
                        <div className="per-person-total">
                          ${formatCurrency(calculateItemTotalPerPerson(item))} each
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="total-cell">
                    <span className="item-total">${formatCurrency(itemTotal)}</span>
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn btn-danger btn-sm remove-item-btn"
                      onClick={() => onRemoveItem(index)}
                      title="Remove item"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ItemsSection