import { useState } from 'react'

interface PeopleSectionProps {
  people: string[]
  onAddPerson: (name: string) => void
  onRemovePerson: (name: string) => void
}

const PeopleSection = ({ people, onAddPerson, onRemovePerson }: PeopleSectionProps) => {
  const [personName, setPersonName] = useState('')

  const handleAddPerson = () => {
    if (personName.trim()) {
      onAddPerson(personName.trim())
      setPersonName('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddPerson()
    }
  }

  return (
    <div className="people-compact">
      <div className="people-input-compact">
        <input
          type="text"
          value={personName}
          onChange={(e) => setPersonName(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Add person..."
          className="person-input"
        />
        <button type="button" onClick={handleAddPerson} className="btn btn-primary btn-sm">
          +
        </button>
      </div>

      <div className="people-list-compact">
        {people.map(person => (
          <div key={person} className="person-chip">
            <span className="person-name">{person}</span>
            <button
              className="remove-btn"
              onClick={() => onRemovePerson(person)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {people.length === 0 && (
        <div className="empty-people">
          <span>No people added yet</span>
        </div>
      )}
    </div>
  )
}

export default PeopleSection