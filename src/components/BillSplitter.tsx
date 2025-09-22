'use client'

import { useState, useRef, useCallback } from 'react'
import { BillSplitterState, TaxRate, BillItem } from '../types/index'
import { usePersonSelection } from '@/hooks/usePersonSelection'
import { useMobileCollapse } from '@/hooks/useMobileCollapse'
import UploadSection from './UploadSection'
import SummarySection from './SummarySection'
import SettingsSection from './SettingsSection'
import PeopleSection from './PeopleSection'
import ItemsSection from './ItemsSection'
import OCRModal from './OCRModal'
import PersonSelectionModal from './PersonSelectionModal'
import { Save } from 'lucide-react'

const BillSplitter = () => {
  const [state, setState] = useState<BillSplitterState>({
    people: [],
    items: [],
    taxRates: [
      { id: 1, name: 'GST', rate: 5.00 },
      { id: 2, name: 'PLT', rate: 10.00 }
    ],
    nextTaxId: 3,
    tipConfig: {
      isPercentage: true,
      value: 20.00
    },
    currentImageUrl: null,
    currentFileType: null
  })

  const [showOCRModal, setShowOCRModal] = useState(false)

  const {
    selectedPerson,
    selectPerson,
    shouldShowModal
  } = usePersonSelection()

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
      // Calculate percentage from fixed amount
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
        setState(prev => ({
          ...prev,
          currentImageUrl: result.path,
          currentFileType: file.type
        }))
      }
    } catch (error) {
      console.error('Upload failed:', error)
      alert('Failed to upload image. Please try again.')
    }
  }

  const processWithOCR = async () => {
    setShowOCRModal(true)

    try {
      // Load Tesseract.js dynamically
      const Tesseract = await import('tesseract.js')

      let ocrSource: HTMLImageElement | HTMLCanvasElement | null = null

      if (state.currentFileType === 'application/pdf') {
        ocrSource = document.getElementById('pdfCanvas') as HTMLCanvasElement
      } else {
        ocrSource = document.getElementById('receiptPreview') as HTMLImageElement
      }

      if (!ocrSource) {
        throw new Error('No image source found')
      }

      const { data: { text } } = await Tesseract.recognize(
        ocrSource,
        'eng',
        {
          logger: m => {
            console.log(m)
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          }
        }
      )

      console.log('OCR completed. Extracted text:', text)
      setShowOCRModal(false)
      parseReceiptText(text)

    } catch (error) {
      setShowOCRModal(false)
      console.error('OCR failed:', error)
      alert('OCR processing failed. You can still add items manually.')
    }
  }

  const parseReceiptText = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line)

    // Extract tax rates from receipt and update existing tax rates
    const updatedTaxRates = [...state.taxRates]

    for (const line of lines) {
      const gstMatch = line.match(/TAX\s+GST\s+(\d+)%/i)
      if (gstMatch) {
        const gstTax = updatedTaxRates.find(tax => tax.name === 'GST')
        if (gstTax) {
          gstTax.rate = parseFloat(gstMatch[1])
        }
      }

      const pltMatch = line.match(/TAX\s+PLT\s+(\d+)%/i)
      if (pltMatch) {
        const pltTax = updatedTaxRates.find(tax => tax.name === 'PLT')
        if (pltTax) {
          pltTax.rate = parseFloat(pltMatch[1])
        }
      }
    }

    // Extract items
    const newItems: BillItem[] = []

    for (const line of lines) {
      const priceMatch = line.match(/^(\d+)?\s*(.+?)\s+(\d+\.?\d*)$/)
      if (priceMatch) {
        const quantity = priceMatch[1] ? parseInt(priceMatch[1]) : 1
        let itemName = priceMatch[2].trim()
        const price = parseFloat(priceMatch[3])

        // Clean up item name
        itemName = itemName.replace(/^(WED|DB|POP|SPCL|BLACKEND|LETTUC|TRUFFLE|SUSHI)\s*/i, '')
        itemName = itemName.replace(/\s*~~\s*/, ' ')

        if (itemName && price && price > 0 && !itemName.toLowerCase().includes('subtotal') &&
            !itemName.toLowerCase().includes('total') && !itemName.toLowerCase().includes('tax')) {

          // Determine tax applicability based on item type
          const isAlcohol = /amaretto|beer|wine|liquor/i.test(itemName)
          const applicableTaxes: { [taxId: number]: boolean } = {}

          // Apply default taxes
          updatedTaxRates.forEach(tax => {
            if (tax.name === 'GST') {
              applicableTaxes[tax.id] = true // GST applies to most items
            } else if (tax.name === 'PLT') {
              applicableTaxes[tax.id] = isAlcohol // PLT applies to alcohol
            } else {
              applicableTaxes[tax.id] = false // Other taxes default to false
            }
          })

          newItems.push({
            name: itemName,
            price: price,
            quantity: quantity,
            applicableTaxes: applicableTaxes,
            assignedPeople: []
          })
        }
      }
    }

    setState(prev => ({
      ...prev,
      taxRates: updatedTaxRates,
      items: [...prev.items, ...newItems]
    }))
  }

  const addPerson = (name: string) => {
    if (name && !state.people.includes(name)) {
      setState(prev => ({
        ...prev,
        people: [...prev.people, name]
      }))
    }
  }

  const removePerson = (name: string) => {
    setState(prev => ({
      ...prev,
      people: prev.people.filter(person => person !== name),
      items: prev.items.map(item => ({
        ...item,
        assignedPeople: item.assignedPeople.filter(person => person !== name)
      }))
    }))
  }

  const addTaxRate = () => {
    const newTax: TaxRate = {
      id: state.nextTaxId,
      name: `Tax ${state.taxRates.length + 1}`,
      rate: 0.00
    }

    setState(prev => ({
      ...prev,
      taxRates: [...prev.taxRates, newTax],
      nextTaxId: prev.nextTaxId + 1,
      items: prev.items.map(item => ({
        ...item,
        applicableTaxes: {
          ...item.applicableTaxes,
          [newTax.id]: false
        }
      }))
    }))
  }

  const removeTaxRate = (taxId: number) => {
    setState(prev => ({
      ...prev,
      taxRates: prev.taxRates.filter(tax => tax.id !== taxId),
      items: prev.items.map(item => {
        const { [taxId]: removed, ...remainingTaxes } = item.applicableTaxes
        return {
          ...item,
          applicableTaxes: remainingTaxes
        }
      })
    }))
  }

  const updateTaxRate = (taxId: number, field: keyof TaxRate, value: string | number) => {
    setState(prev => ({
      ...prev,
      taxRates: prev.taxRates.map(tax =>
        tax.id === taxId ? { ...tax, [field]: value } : tax
      )
    }))
  }

  const updateTipConfig = (isPercentage: boolean, value: number) => {
    setState(prev => ({
      ...prev,
      tipConfig: { isPercentage, value }
    }))
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

    setState(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  const removeItem = (index: number) => {
    setState(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }))
  }

  const updateItemProperty = (index: number, property: keyof BillItem, value: any) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [property]: value } : item
      )
    }))
  }

  const updateItemTax = (itemIndex: number, taxId: number, isChecked: boolean) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
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
    }))
  }

  const togglePersonForItem = (itemIndex: number, person: string, isChecked: boolean) => {
    setState(prev => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === itemIndex
          ? {
              ...item,
              assignedPeople: isChecked
                ? [...item.assignedPeople, person]
                : item.assignedPeople.filter(p => p !== person)
            }
          : item
      )
    }))
  }

  const showSections = state.currentImageUrl !== null

  return (
    <div className="app-container">
      {/* Fixed Header */}
      <header className="app-header">
        <h1>Bill Splitter</h1>
        <div className="header-actions">
          {state.items.length > 0 && (
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                try {
                  const receiptData = {
                    name: `Receipt ${new Date().toLocaleString()}`,
                    items: state.items.map(item => ({
                      ...item,
                      applicable_taxes: item.applicableTaxes
                    })),
                    people: state.people,
                    tax_rates: state.taxRates,
                    tip_config: {
                      is_percentage: state.tipConfig.isPercentage,
                      value: state.tipConfig.value
                    },
                    image_url: state.currentImageUrl,
                    image_type: state.currentFileType
                  };

                  const response = await fetch('/api/receipts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(receiptData)
                  });

                  if (response.ok) {
                    const { receipt } = await response.json();
                    const shareUrl = `${window.location.origin}/share/${receipt.access_token}`;
                    navigator.clipboard.writeText(shareUrl);
                    alert('Receipt saved! Share link copied to clipboard.');
                    window.location.href = `/share/${receipt.access_token}`;
                  } else {
                    alert('Failed to save receipt');
                  }
                } catch (error) {
                  alert('Failed to save receipt');
                }
              }}
            >
              <Save size={14} />
              Save & Share
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

      <OCRModal show={showOCRModal} />

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

export default BillSplitter