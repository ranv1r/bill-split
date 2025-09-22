'use client'

import { useState, useEffect, useCallback } from 'react'
import { Receipt, BillItem, TaxRate, TipConfig } from '../types'

interface TokenBasedReceiptState {
  receipt: Receipt | null
  isLoading: boolean
  error: string | null
}

export function useTokenBasedReceipt(token: string) {
  const [state, setState] = useState<TokenBasedReceiptState>({
    receipt: null,
    isLoading: true,
    error: null
  })

  const fetchReceipt = useCallback(async () => {
    if (!token) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(`/api/receipts/share/${token}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Receipt not found')
        } else if (response.status === 400) {
          throw new Error('Invalid access token')
        } else {
          throw new Error('Failed to load receipt')
        }
      }

      const { receipt } = await response.json()
      setState({ receipt, isLoading: false, error: null })
    } catch (error) {
      console.error('Error fetching receipt:', error)
      setState({
        receipt: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load receipt'
      })
    }
  }, [token])

  const updateReceipt = useCallback(async (updates: Partial<Receipt>) => {
    if (!token) return

    try {
      const response = await fetch(`/api/receipts/share/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        const { receipt } = await response.json()
        setState(prev => ({ ...prev, receipt }))
        return receipt
      } else {
        throw new Error('Failed to update receipt')
      }
    } catch (error) {
      console.error('Error updating receipt:', error)
      throw error
    }
  }, [token])

  const updateState = useCallback((updates: Partial<Pick<Receipt, 'items' | 'people' | 'tax_rates' | 'tip_config'>>) => {
    if (!state.receipt) return

    const updatedReceipt = { ...state.receipt, ...updates }
    setState(prev => ({ ...prev, receipt: updatedReceipt }))

    // Debounced save to backend
    setTimeout(() => {
      updateReceipt(updatedReceipt).catch(console.error)
    }, 500)
  }, [state.receipt, updateReceipt])

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/share/${token}`

  useEffect(() => {
    fetchReceipt()
  }, [fetchReceipt])

  return {
    state: state.receipt ? {
      name: state.receipt.name,
      image_url: state.receipt.image_url,
      image_type: state.receipt.image_type,
      items: state.receipt.items,
      people: state.receipt.people,
      tax_rates: state.receipt.tax_rates,
      tip_config: state.receipt.tip_config
    } : {
      name: '',
      image_url: '',
      image_type: '',
      items: [],
      people: [],
      tax_rates: [],
      tip_config: { is_percentage: true, value: 20 }
    },
    isLoading: state.isLoading,
    error: state.error,
    updateState,
    shareUrl,
    isConnected: true // Always show as connected for shared receipts
  }
}