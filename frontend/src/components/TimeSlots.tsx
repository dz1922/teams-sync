import type { TimeSlot } from '../types';

interface TimeSlotsProps {
  slots: TimeSlot[];
  onSelect: (slot: TimeSlot) => void;
  title: string;
}

export function TimeSlots({ slots, onSelect, title }: TimeSlotsProps) {
  if (slots.length === 0) {
    return null;
  }

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  const getStatusIcon = (status: string, isBusy: boolean) => {
    if (isBusy) return '❌';
    switch (status) {
      case 'core': return '✅';
      case 'edge': return '⚠️';
      case 'flexible': return '🔶';
      case 'outside': return '⛔';
      default: return '❓';
    }
  };

  const getMedalEmoji = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  return (
    <div className="time-slots">
      <h3>{title}</h3>
      <ul className="slot-list">
        {slots.map((slot, index) => (
          <li key={slot.start} className={`slot-item ${slot.allAvailable ? 'available' : 'conflict'}`}>
            <div className="slot-header">
              <span className="slot-rank">{getMedalEmoji(index)}</span>
              <span className="slot-time">
                {formatTime(slot.start)} - {new Date(slot.end).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="slot-score">Score: {slot.score}</span>
            </div>
            <ul className="slot-details">
              {slot.details.map(detail => (
                <li key={detail.personId} className={`detail-item ${detail.isBusy ? 'busy' : detail.status}`}>
                  <span className="detail-icon">{getStatusIcon(detail.status, detail.isBusy)}</span>
                  <span className="detail-name">{detail.displayName}</span>
                  <span className="detail-time">{detail.localTime}</span>
                  {detail.scheduleContext && (
                    <span className={`detail-context ${detail.isBusy ? 'busy-context' : 'free-context'}`}>
                      {detail.scheduleContext}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {slot.allAvailable && (
              <button className="select-btn" onClick={() => onSelect(slot)}>
                Select This Time
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
