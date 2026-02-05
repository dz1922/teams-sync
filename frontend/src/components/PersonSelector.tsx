import { useState, useEffect, useMemo } from 'react';
import type { Person } from '../types';
import { personsApi } from '../api/client';

interface PersonSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PersonSelector({ selectedIds, onChange }: PersonSelectorProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    personsApi.list()
      .then(setPersons)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredPersons = useMemo(() => {
    if (!searchTerm.trim()) return persons;
    const term = searchTerm.toLowerCase();
    return persons.filter(p => 
      p.displayName.toLowerCase().includes(term) ||
      p.timezone.toLowerCase().includes(term) ||
      p.accounts.some(a => a.email.toLowerCase().includes(term))
    );
  }, [persons, searchTerm]);

  const togglePerson = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedPersons = persons.filter(p => selectedIds.includes(p.id));

  if (loading) return <div className="loading">Loading persons...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="person-selector">
      <h3>Select Participants ({selectedIds.length} selected)</h3>
      
      {/* Selected persons chips */}
      {selectedPersons.length > 0 && (
        <div className="selected-chips">
          {selectedPersons.map(p => (
            <span key={p.id} className="chip" onClick={() => togglePerson(p.id)}>
              {p.displayName} ✕
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <input
        type="text"
        className="search-input"
        placeholder="🔍 Search by name, email, or timezone..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
      />

      {persons.length === 0 ? (
        <p className="empty">No persons configured. Add some in Settings.</p>
      ) : (
        <ul className="person-list">
          {filteredPersons.map(person => (
            <li key={person.id} className={`person-item ${selectedIds.includes(person.id) ? 'selected' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(person.id)}
                  onChange={() => togglePerson(person.id)}
                />
                <span className="person-name">{person.displayName}</span>
                <span className="person-tz">({person.timezone})</span>
              </label>
            </li>
          ))}
          {filteredPersons.length === 0 && searchTerm && (
            <li className="no-results">No persons match "{searchTerm}"</li>
          )}
        </ul>
      )}
    </div>
  );
}
