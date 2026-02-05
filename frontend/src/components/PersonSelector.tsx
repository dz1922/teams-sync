import { useState, useEffect } from 'react';
import { Person } from '../types';
import { personsApi } from '../api/client';

interface PersonSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PersonSelector({ selectedIds, onChange }: PersonSelectorProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    personsApi.list()
      .then(setPersons)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const togglePerson = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(x => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  if (loading) return <div className="loading">Loading persons...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="person-selector">
      <h3>Select Participants</h3>
      {persons.length === 0 ? (
        <p className="empty">No persons configured. Add some in Settings.</p>
      ) : (
        <ul className="person-list">
          {persons.map(person => (
            <li key={person.id} className="person-item">
              <label>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(person.id)}
                  onChange={() => togglePerson(person.id)}
                />
                <span className="person-name">{person.displayName}</span>
                <span className="person-tz">({person.timezone})</span>
                <span className="person-accounts">
                  {person.accounts.map(a => a.email).join(', ')}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
