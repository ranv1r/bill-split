'use client'

import { useCallback } from 'react'
import { BillItem, TaxRate } from '../types/index'
import { useTokenBasedReceipt } from '@/hooks/useTokenBasedReceipt'
import { usePersonSelection } from '@/hooks/usePersonSelection'
import { useMobileCollapse } from '@/hooks/useMobileCollapse'
import SummarySection from './SummarySection'
import SettingsSection from './SettingsSection'
import PeopleSection from './PeopleSection'
import ItemsSection from './ItemsSection'
import PersonSelectionModal from './PersonSelectionModal'
import { Radio, Share } from 'lucide-react'

interface TokenBasedBillSplitterProps {
  token: string
}

const TokenBasedBillSplitter = ({ token }: TokenBasedBillSplitterProps) => {
  const {
    state,
    isLoading,
    isConnected,
    error,
    updateState,
    shareUrl
  } = useTokenBasedReceipt(token)

  const {
    selectedPerson,
    selectPerson,
    shouldShowModal,
    resetSelection
  } = usePersonSelection(token)

  // Initialize mobile collapse functionality
  useMobileCollapse()

  const formatCurrency = useCallback((amount: number): string => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0.00'
    }
    return amount.toFixed(2)
  }, [])

  const calculateSubtotal = useCallback((): number => {
    return state.items.reduce((total, item) => {
      return total + item.price
    }, 0)
  }, [state.items])

  const calculateTotalTax = useCallback((): number => {
    const subtotal = calculateSubtotal()
    return state.tax_rates.reduce((totalTax, taxRate) => {
      const applicableSubtotal = state.items.reduce((itemTotal, item) => {
        return item.applicable_taxes[taxRate.id] ? itemTotal + item.price : itemTotal
      }, 0)
      return totalTax + (applicableSubtotal * taxRate.rate / 100)
    }, 0)
  }, [state.items, state.tax_rates, calculateSubtotal])

  const calculateTipAmount = useCallback((): number => {
    const subtotal = calculateSubtotal()
    if (state.tip_config.is_percentage) {
      return subtotal * state.tip_config.value / 100
    }
    return state.tip_config.value
  }, [state.tip_config, calculateSubtotal])

  const calculateTotal = useCallback((): number => {
    return calculateSubtotal() + calculateTotalTax() + calculateTipAmount()
  }, [calculateSubtotal, calculateTotalTax, calculateTipAmount])

  const calculatePersonTotal = useCallback((person: string): number => {
    let personSubtotal = 0

    state.items.forEach(item => {
      const assignedPeople = Array.isArray(item.assigned_people) ? item.assigned_people : []
      if (assignedPeople.includes(person)) {
        const sharePerPerson = item.price / assignedPeople.length
        personSubtotal += sharePerPerson
      }
    })

    let personTax = 0
    state.tax_rates.forEach(taxRate => {
      const applicableSubtotal = state.items.reduce((itemTotal, item) => {
        const assignedPeople = Array.isArray(item.assigned_people) ? item.assigned_people : []
        if (assignedPeople.includes(person) && item.applicable_taxes[taxRate.id]) {
          return itemTotal + (item.price / assignedPeople.length)
        }
        return itemTotal
      }, 0)
      personTax += (applicableSubtotal * taxRate.rate / 100)
    })

    const personTipAmount = state.tip_config.is_percentage
      ? personSubtotal * state.tip_config.value / 100
      : (personSubtotal / calculateSubtotal()) * state.tip_config.value

    return personSubtotal + personTax + personTipAmount
  }, [state.items, state.tax_rates, state.tip_config, calculateSubtotal])

  const addItem = useCallback((item: BillItem) => {
    updateState({
      items: [...state.items, item]
    })
  }, [state.items, updateState])

  const updateItem = useCallback((index: number, updatedItem: BillItem) => {
    const newItems = [...state.items]
    newItems[index] = updatedItem
    updateState({
      items: newItems
    })
  }, [state.items, updateState])

  const deleteItem = useCallback((index: number) => {
    const newItems = state.items.filter((_, i) => i !== index)
    updateState({
      items: newItems
    })
  }, [state.items, updateState])

  const addPerson = useCallback((person: string) => {
    if (!state.people.includes(person)) {
      updateState({
        people: [...state.people, person]
      })
    }
  }, [state.people, updateState])

  const deletePerson = useCallback((person: string) => {
    const newPeople = state.people.filter(p => p !== person)
    const newItems = state.items.map(item => ({
      ...item,
      assigned_people: Array.isArray(item.assigned_people) ? item.assigned_people.filter(p => p !== person) : []
    }))

    updateState({
      people: newPeople,
      items: newItems
    })

    if (selectedPerson === person) {
      resetSelection()
    }
  }, [state.people, state.items, selectedPerson, updateState, resetSelection])

  const addTaxRate = useCallback((taxRate: TaxRate) => {
    updateState({
      tax_rates: [...state.tax_rates, taxRate]
    })
  }, [state.tax_rates, updateState])

  const updateTaxRate = useCallback((index: number, updatedTaxRate: TaxRate) => {
    const newTaxRates = [...state.tax_rates]
    newTaxRates[index] = updatedTaxRate
    updateState({
      tax_rates: newTaxRates
    })
  }, [state.tax_rates, updateState])

  const deleteTaxRate = useCallback((taxId: number) => {
    const newTaxRates = state.tax_rates.filter(tax => tax.id !== taxId)
    const newItems = state.items.map(item => ({
      ...item,
      applicable_taxes: Object.fromEntries(
        Object.entries(item.applicable_taxes).filter(([id]) => parseInt(id) !== taxId)
      )
    }))

    updateState({
      tax_rates: newTaxRates,
      items: newItems
    })
  }, [state.tax_rates, state.items, updateState])


  if (error) {
    return (
      <div className="error-container">
        <h2>Error Loading Receipt</h2>
        <p>{error}</p>
        <p>Please check that the link is correct and try again.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading receipt...</div>
      </div>
    )
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1>Bill Splitter</h1>
          <div className="header-actions">
            {state.items.length > 0 && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl)
                  alert('Share link copied to clipboard!')
                }}
              >
                <Share size={14} />
                Copy Link
              </button>
            )}

            {state.items.length > 0 && (
              <div className="total-display">
                Total: ${formatCurrency(calculateTotal())}
              </div>
            )}

            <div className="connection-status">
              {isConnected ? (
                <span className="status-indicator connected">
                  <Radio size={12} />
                  Live
                </span>
              ) : (
                <span className="status-indicator disconnected">Offline</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="app-sidebar">
        {/* Receipt Preview - Read Only */}
        {state.image_url && (
          <div className="sidebar-section">
            <div className="section-title">Receipt</div>
            <div className="receipt-preview readonly">
              <img
                src={state.image_url}
                alt="Receipt"
                style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
              />
              <div className="readonly-notice">
                <small>This receipt is read-only in shared view</small>
              </div>
            </div>
          </div>
        )}

        {/* Summary Section */}
        <div className="sidebar-section">
          <div className="section-title">Summary</div>
          <SummarySection
            items={state.items}
            people={state.people}
            taxRates={state.tax_rates}
            tipConfig={state.tip_config}
            calculateItemTotal={(item) => item.price}
            calculateItemTotalPerPerson={(item) => {
            const assignedPeople = Array.isArray(item.assigned_people) ? item.assigned_people : []
            return assignedPeople.length ? item.price / assignedPeople.length : 0
          }}
            calculateSubtotal={calculateSubtotal}
            getTipPercentage={() => state.tip_config.is_percentage ? state.tip_config.value : 0}
            formatCurrency={formatCurrency}
            selectedPerson={selectedPerson}
          />
        </div>

        {/* Settings Section - Read Only */}
        <div className="sidebar-section">
          <div className="section-title">Configuration</div>
          <SettingsSection
            taxRates={state.tax_rates}
            tipConfig={state.tip_config}
            onAddTaxRate={() => {}} // Disabled
            onUpdateTaxRate={() => {}} // Disabled
            onRemoveTaxRate={() => {}} // Disabled
            onUpdateTipConfig={() => {}} // Disabled
            formatCurrency={formatCurrency}
            readOnly={true}
          />
        </div>

        {/* People Section - Read Only */}
        <div className="sidebar-section">
          <div className="section-title">People</div>
          <PeopleSection
            people={state.people}
            onAddPerson={() => {}} // Disabled
            onRemovePerson={() => {}} // Disabled
            readOnly={true}
          />
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <ItemsSection
          items={state.items}
          people={state.people}
          taxRates={state.tax_rates}
          onAddManualItem={() => {}} // Disabled - no adding items in share view
          onRemoveItem={() => {}} // Disabled - no removing items in share view
          onUpdateItemProperty={() => {}} // Disabled - no editing item properties in share view
          onUpdateItemTax={() => {}} // Disabled - no editing taxes in share view
          onTogglePersonForItem={(itemIndex, person, isChecked) => {
            // Only allow person assignment changes in share view
            const item = state.items[itemIndex]
            const currentAssignedPeople = Array.isArray(item.assigned_people) ? item.assigned_people : []
            const updatedAssignedPeople = isChecked
              ? [...currentAssignedPeople, person]
              : currentAssignedPeople.filter(p => p !== person)
            const updatedItem = { ...item, assigned_people: updatedAssignedPeople }
            updateItem(itemIndex, updatedItem)
          }}
          calculateItemTotal={(item) => {
            // Calculate item total with taxes
            let total = item.price
            if (item.applicable_taxes) {
              state.tax_rates.forEach(tax => {
                if (item.applicable_taxes[tax.id]) {
                  total += item.price * (tax.rate / 100)
                }
              })
            }
            return total
          }}
          calculateItemTotalPerPerson={(item) => {
            const assignedPeople = Array.isArray(item.assigned_people) ? item.assigned_people : []
            return assignedPeople.length ? item.price / assignedPeople.length : 0
          }}
          formatCurrency={formatCurrency}
          readOnly={true} // Make items read-only except for person assignments
        />
      </main>


      {shouldShowModal(state.people) && (
        <PersonSelectionModal
          people={state.people}
          onSelect={selectPerson}
          onClose={() => {
            // Don't reset, just ensure modal closes by setting hasShownModal to true
            if (!selectedPerson) {
              selectPerson(null)
            }
          }}
        />
      )}
    </div>
  )
}

export default TokenBasedBillSplitter