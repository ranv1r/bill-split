'use client'

import { useState, useEffect } from 'react'
import { User } from 'lucide-react'

interface PersonSelectionModalProps {
  people: string[]
  onSelect: (person: string | null) => void
  onClose: () => void
}

const PersonSelectionModal = ({ people, onSelect, onClose }: PersonSelectionModalProps) => {
  // Explicitly initialize as null and force reset
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null)

  // Force reset on every mount to ensure clean state
  useEffect(() => {
    setSelectedPerson(null)
  }, [])

  // Also reset when people array changes
  useEffect(() => {
    setSelectedPerson(null)
  }, [people])

  const handlePersonSelect = (person: string) => {
    // Force single selection by always setting to the new person
    // If same person is clicked, deselect them
    setSelectedPerson(currentSelected => currentSelected === person ? null : person)
  }

  const handleConfirm = () => {
    onSelect(selectedPerson)
    onClose()
  }

  const handleSkip = () => {
    onSelect(null)
    onClose()
  }

  return (
    <div className="person-selection-modal">
      <div className="person-selection-content">
        <User size={32} className="mx-auto mb-4" style={{ color: 'var(--primary-blue)' }} />
        <h2>Who are you?</h2>
        <p>Select your name to see your personal breakdown and what you owe.</p>

        <div className="person-options">
          {people.map((person) => (
            <button
              key={person}
              className={`person-option ${selectedPerson === person ? 'selected' : 'unselected'}`}
              onClick={() => handlePersonSelect(person)}
              data-person={person}
              data-selected={selectedPerson === person}
            >
              {person}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            className="btn btn-primary"
            onClick={handleConfirm}
            disabled={!selectedPerson}
            style={{ opacity: selectedPerson ? 1 : 0.5 }}
          >
            Continue as {selectedPerson || 'Selected Person'}
          </button>
        </div>

        <button className="skip-selection" onClick={handleSkip}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

export default PersonSelectionModal