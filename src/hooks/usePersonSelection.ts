'use client'

import { useState, useEffect } from 'react'

const SELECTED_PERSON_KEY = 'bill-splitter-selected-person'

export const usePersonSelection = (receiptId?: string) => {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)
  const [hasShownModal, setHasShownModal] = useState(false)

  // Generate a unique key for this receipt if we have a receiptId
  const storageKey = receiptId ? `${SELECTED_PERSON_KEY}-${receiptId}` : SELECTED_PERSON_KEY

  useEffect(() => {
    // Load selected person from localStorage
    const saved = localStorage.getItem(storageKey)
    if (saved && saved !== 'null') {
      setSelectedPerson(saved)
      setHasShownModal(true)
    }
  }, [storageKey])

  const selectPerson = (person: string | null) => {
    setSelectedPerson(person)
    setHasShownModal(true)

    // Save to localStorage
    if (person) {
      localStorage.setItem(storageKey, person)
    } else {
      localStorage.setItem(storageKey, 'null') // Store 'null' to remember user skipped
    }
  }

  const shouldShowModal = (people: string[]) => {
    return people.length > 0 && !hasShownModal && !selectedPerson
  }

  const resetSelection = () => {
    setSelectedPerson(null)
    setHasShownModal(false)
    localStorage.removeItem(storageKey)
  }

  return {
    selectedPerson,
    selectPerson,
    shouldShowModal,
    resetSelection,
    hasShownModal
  }
}