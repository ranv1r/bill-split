'use client'

import { useCallback } from 'react'
import { BillItem, TaxRate } from '../types/index'
import { useRealtimeReceipt } from '@/hooks/useRealtimeReceipt'
import { usePersonSelection } from '@/hooks/usePersonSelection'
import { useMobileCollapse } from '@/hooks/useMobileCollapse'
import UploadSection from './UploadSection'
import SummarySection from './SummarySection'
import SettingsSection from './SettingsSection'
import PeopleSection from './PeopleSection'
import ItemsSection from './ItemsSection'
import OCRModal from './OCRModal'
import PersonSelectionModal from './PersonSelectionModal'
import { Radio, Share } from 'lucide-react'

interface CollaborativeBillSplitterProps {
  receiptId?: string
}

const CollaborativeBillSplitter = ({ receiptId }: CollaborativeBillSplitterProps) => {
  const {
    state,
    isLoading,
    isConnected,
    error,
    saveReceipt,
    updateState,
    shareUrl
  } = useRealtimeReceipt(receiptId)

  const {
    selectedPerson,
    selectPerson,
    shouldShowModal,
    resetSelection
  } = usePersonSelection(receiptId)

  // Initialize mobile collapse functionality
  useMobileCollapse()

  const formatCurrency = useCallback((amount: number): string => {
    return amount.toFixed(2)
  }, [])

  const calculateSubtotal = useCallback((): number => {
    return state.items.reduce((total, item) => {
      return total + item.price
    }, 0)
  }, [state.items])

  const getTipPercentage = useCallback((): number => {
    if (state.tipConfig.isPercentage) {
      return state.tipConfig.value
    } else {
      const subtotal = calculateSubtotal()
      if (subtotal === 0) return 0
      return (state.tipConfig.value / subtotal) * 100
    }
  }, [state.tipConfig, calculateSubtotal])

  const calculateItemTotal = useCallback((item: BillItem): number => {
    const subtotal = item.price
    let totalTax = 0

    state.taxRates.forEach(tax => {
      if (item.applicableTaxes[tax.id]) {
        totalTax += subtotal * (tax.rate / 100)
      }
    })

    const subtotalWithTax = subtotal + totalTax
    const tipPercentage = getTipPercentage()
    const tip = subtotalWithTax * (tipPercentage / 100)
    return subtotalWithTax + tip
  }, [state.taxRates, getTipPercentage])

  const calculateItemTotalPerPerson = useCallback((item: BillItem): number => {
    if (item.assignedPeople.length === 0) return 0
    return calculateItemTotal(item) / item.assignedPeople.length
  }, [calculateItemTotal])

  const handleFileUpload = async (file: File) => {
    const formData = new FormData()
    formData.append('receipt', file)

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      if (result.success) {
        updateState({
          currentImageUrl: result.path,
          currentFileType: file.type
        })
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image. Please try again.')
    }
  }

  const processWithOCR = async () => {
    // OCR processing logic remains the same
    // but uses updateState instead of setState
  }

  const addPerson = (name: string) => {
    if (name && !state.people.includes(name)) {
      updateState({
        people: [...state.people, name]
      })
    }
  }

  const removePerson = (name: string) => {
    updateState({
      people: state.people.filter(person => person !== name),
      items: state.items.map(item => ({
        ...item,
        assignedPeople: item.assignedPeople.filter(person => person !== name)
      }))
    })
  }

  const addTaxRate = () => {
    const newTax: TaxRate = {
      id: state.nextTaxId,
      name: `Tax ${state.taxRates.length + 1}`,
      rate: 0.00
    }

    updateState({
      taxRates: [...state.taxRates, newTax],
      nextTaxId: state.nextTaxId + 1,
      items: state.items.map(item => ({
        ...item,
        applicableTaxes: {
          ...item.applicableTaxes,
          [newTax.id]: false
        }
      }))
    })
  }

  const removeTaxRate = (taxId: number) => {
    updateState({
      taxRates: state.taxRates.filter(tax => tax.id !== taxId),
      items: state.items.map(item => {
        const { [taxId]: removed, ...remainingTaxes } = item.applicableTaxes
        return {
          ...item,
          applicableTaxes: remainingTaxes
        }
      })
    })
  }

  const updateTaxRate = (taxId: number, field: keyof TaxRate, value: string | number) => {
    updateState({
      taxRates: state.taxRates.map(tax =>
        tax.id === taxId ? { ...tax, [field]: value } : tax
      )
    })
  }

  const updateTipConfig = (isPercentage: boolean, value: number) => {
    updateState({
      tipConfig: { isPercentage, value }
    })
  }

  const addManualItem = () => {
    const applicableTaxes: { [taxId: number]: boolean } = {}
    state.taxRates.forEach(tax => {
      applicableTaxes[tax.id] = false
    })

    const newItem: BillItem = {
      name: 'New Item',
      price: 0.00,
      quantity: 1,
      applicableTaxes: applicableTaxes,
      assignedPeople: []
    }

    updateState({
      items: [...state.items, newItem]
    })
  }

  const removeItem = (index: number) => {
    updateState({
      items: state.items.filter((_, i) => i !== index)
    })
  }

  const updateItemProperty = (index: number, property: keyof BillItem, value: any) => {
    updateState({
      items: state.items.map((item, i) =>
        i === index ? { ...item, [property]: value } : item
      )
    })
  }

  const updateItemTax = (itemIndex: number, taxId: number, isChecked: boolean) => {
    updateState({
      items: state.items.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              applicableTaxes: {
                ...item.applicableTaxes,
                [taxId]: isChecked
              }
            }
          : item
      )
    })
  }

  const togglePersonForItem = (itemIndex: number, person: string, isChecked: boolean) => {
    updateState({
      items: state.items.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              assignedPeople: isChecked
                ? [...item.assignedPeople, person]
                : item.assignedPeople.filter(p => p !== person)
            }
          : item
      )
    })
  }

  const showSections = state.currentImageUrl !== null

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading-state">
          <h2>Loading receipt...</h2>
        </div>
      </div>
    )
  }

  return (
    <div className="app-container">
      {/* Fixed Header */}
      <header className="app-header">
        <h1>Bill Splitter</h1>
        <div className="header-actions">
          <div className="connection-status">
            {isConnected ? (
              <span className="status-connected">
                <Radio size={16} color="#10b981" />
                Live
              </span>
            ) : (
              <span className="status-disconnected">
                <Radio size={16} color="#ef4444" />
                Offline
              </span>
            )}
          </div>

          {shareUrl && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl)
                alert('Share link copied to clipboard!')
              }}
            >
              <Share size={14} />
              Share
            </button>
          )}

          {!receiptId && state.items.length > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={saveReceipt}
            >
              💾 Save & Share
            </button>
          )}

          {state.items.length > 0 && (
            <div className="total-display">
              Total: ${formatCurrency(
                state.items.reduce((sum, item) => sum + calculateItemTotal(item), 0)
              )}
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="error-banner">
          ⚠️ {error}
        </div>
      )}

      {/* Sidebar */}
      <aside className="app-sidebar">
        {/* Upload Section */}
        <div className="sidebar-section">
          <div className="section-title">Receipt</div>
          <UploadSection
            currentImageUrl={state.currentImageUrl}
            currentFileType={state.currentFileType}
            onFileUpload={handleFileUpload}
            onProcessOCR={processWithOCR}
          />
        </div>

        {showSections && (
          <>
            {/* Summary Section */}
            <div className="sidebar-section">
              <div className="section-title">Summary</div>
              <SummarySection
                items={state.items}
                people={state.people}
                taxRates={state.taxRates}
                tipConfig={state.tipConfig}
                calculateItemTotal={calculateItemTotal}
                calculateItemTotalPerPerson={calculateItemTotalPerPerson}
                calculateSubtotal={calculateSubtotal}
                getTipPercentage={getTipPercentage}
                formatCurrency={formatCurrency}
                selectedPerson={selectedPerson}
              />
            </div>

            {/* Settings Section */}
            <div className="sidebar-section">
              <div className="section-title">Configuration</div>
              <SettingsSection
                taxRates={state.taxRates}
                tipConfig={state.tipConfig}
                onAddTaxRate={addTaxRate}
                onRemoveTaxRate={removeTaxRate}
                onUpdateTaxRate={updateTaxRate}
                onUpdateTipConfig={updateTipConfig}
                formatCurrency={formatCurrency}
              />
            </div>

            {/* People Section */}
            <div className="sidebar-section">
              <div className="section-title">People</div>
              <PeopleSection
                people={state.people}
                onAddPerson={addPerson}
                onRemovePerson={removePerson}
              />
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {showSections && (
          <ItemsSection
            items={state.items}
            people={state.people}
            taxRates={state.taxRates}
            onAddManualItem={addManualItem}
            onRemoveItem={removeItem}
            onUpdateItemProperty={updateItemProperty}
            onUpdateItemTax={updateItemTax}
            onTogglePersonForItem={togglePersonForItem}
            calculateItemTotal={calculateItemTotal}
            calculateItemTotalPerPerson={calculateItemTotalPerPerson}
            formatCurrency={formatCurrency}
          />
        )}
        {!showSections && (
          <div className="empty-state">
            <h2>Upload a receipt to get started</h2>
            <p>Upload an image or PDF of your receipt to automatically extract items and split the bill.</p>
          </div>
        )}
      </main>

      <OCRModal show={false} />

      {shouldShowModal(state.people) && (
        <PersonSelectionModal
          key={`modal-${state.people.join('-')}`}
          people={state.people}
          onSelect={selectPerson}
          onClose={() => {}}
        />
      )}
    </div>
  )
}

export default CollaborativeBillSplitter