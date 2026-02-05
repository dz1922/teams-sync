import { useState } from 'react';
import { MeetingScheduler } from './components/MeetingScheduler';
import './App.css';

type Tab = 'scheduler' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('scheduler');

  return (
    <div className="app">
      <header className="app-header">
        <h1>📅 MeetSync</h1>
        <p>Smart meeting scheduling across Teams tenants</p>
        <nav className="tabs">
          <button
            className={activeTab === 'scheduler' ? 'active' : ''}
            onClick={() => setActiveTab('scheduler')}
          >
            Schedule Meeting
          </button>
          <button
            className={activeTab === 'settings' ? 'active' : ''}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'scheduler' && <MeetingScheduler />}
        {activeTab === 'settings' && (
          <div className="settings">
            <h2>⚙️ Settings</h2>
            <p>
              Configure tenants and persons via the API for now.<br />
              A full settings UI will be added in a future update.
            </p>
            <h3>API Endpoints</h3>
            <ul>
              <li><code>GET /api/tenants</code> - List tenants</li>
              <li><code>POST /api/tenants</code> - Add tenant</li>
              <li><code>GET /api/persons</code> - List persons</li>
              <li><code>POST /api/persons</code> - Add person</li>
              <li><code>POST /api/persons/:id/accounts</code> - Link account</li>
            </ul>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>MeetSync - Multi-tenant Teams Calendar Sync</p>
      </footer>
    </div>
  );
}

export default App;
