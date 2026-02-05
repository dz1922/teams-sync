import { useState } from 'react';
import { PersonSelector } from './PersonSelector';
import { TimeSlots } from './TimeSlots';
import { TimeSlot, RecommendationResponse } from '../types';
import { recommendApi } from '../api/client';

export function MeetingScheduler() {
  const [selectedPersonIds, setSelectedPersonIds] = useState<string[]>([]);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendationResponse | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const findSlots = async () => {
    if (selectedPersonIds.length < 2) {
      setError('Please select at least 2 participants');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const response = await recommendApi.getSlots({
        personIds: selectedPersonIds,
        startTime: new Date(dateRange.start).toISOString(),
        endTime: new Date(dateRange.end + 'T23:59:59').toISOString(),
        durationMinutes,
      });
      setResults(response);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSlot = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const confirmMeeting = () => {
    if (!selectedSlot) return;
    // In a real app, this would open a meeting creation dialog or call the Graph API
    alert(`Meeting scheduled for ${new Date(selectedSlot.start).toLocaleString()}\n\nIn a production app, this would create a Teams meeting.`);
  };

  return (
    <div className="meeting-scheduler">
      <h2>🗓️ Schedule a Meeting</h2>

      <div className="scheduler-form">
        <PersonSelector
          selectedIds={selectedPersonIds}
          onChange={setSelectedPersonIds}
        />

        <div className="form-group">
          <label>Meeting Duration</label>
          <select value={durationMinutes} onChange={e => setDurationMinutes(Number(e.target.value))}>
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>

        <div className="form-group">
          <label>Date Range</label>
          <div className="date-range">
            <input
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
            />
          </div>
        </div>

        <button
          className="find-slots-btn"
          onClick={findSlots}
          disabled={loading || selectedPersonIds.length < 2}
        >
          {loading ? 'Finding slots...' : 'Find Available Times'}
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {results && (
        <div className="results">
          <div className="results-meta">
            Found {results.recommendations.length} available slots for {results.meta.personsCount} people
          </div>

          <TimeSlots
            slots={results.recommendations}
            onSelect={handleSelectSlot}
            title="✅ Available Times"
          />

          {results.alternativesWithConflicts.length > 0 && (
            <TimeSlots
              slots={results.alternativesWithConflicts}
              onSelect={() => {}}
              title="⚠️ Alternatives (with conflicts)"
            />
          )}

          {results.errors && results.errors.length > 0 && (
            <div className="api-errors">
              <h4>⚠️ Some calendars couldn't be accessed:</h4>
              <ul>
                {results.errors.map((err, i) => (
                  <li key={i}>Tenant {err.tenantId}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {selectedSlot && (
        <div className="confirmation-modal">
          <div className="modal-content">
            <h3>Confirm Meeting</h3>
            <p>
              <strong>Time:</strong> {new Date(selectedSlot.start).toLocaleString()} - {new Date(selectedSlot.end).toLocaleTimeString()}
            </p>
            <p><strong>Participants:</strong></p>
            <ul>
              {selectedSlot.details.map(d => (
                <li key={d.personId}>{d.displayName} ({d.localTime})</li>
              ))}
            </ul>
            <div className="modal-actions">
              <button onClick={() => setSelectedSlot(null)}>Cancel</button>
              <button className="primary" onClick={confirmMeeting}>Create Meeting</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
