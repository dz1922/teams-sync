# MeetSync (Teams-Sync)

Multi-tenant Microsoft Teams calendar synchronization and intelligent meeting time recommendations.

## Features

- 📅 Aggregate calendars from multiple Microsoft Teams tenants
- 🌍 Smart meeting time recommendations across time zones
- 👥 Support multiple accounts per person (same person, different tenants)
- ⏰ Flexible working hours configuration
- 🔒 Privacy-first: Only reads free/busy status, not meeting details

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend (React)               │
│  - Person selection                              │
│  - Time slot recommendations                     │
│  - Meeting confirmation                          │
└─────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────┐
│              Backend (Node.js/Express)           │
│  - REST API                                      │
│  - Recommendation algorithm                      │
│  - Multi-tenant calendar aggregation             │
└─────────────────────────────────────────────────┘
                        │
          ┌─────────────┴─────────────┐
          ▼                           ▼
┌─────────────────┐        ┌─────────────────────┐
│   PostgreSQL    │        │ Microsoft Graph API │
│   (User data)   │        │ (Calendar data)     │
└─────────────────┘        └─────────────────────┘
```

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Azure AD App Registration(s) with `Calendars.Read.Shared` permission

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# Run database migrations
npx prisma migrate deploy

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:5432/meetsync"
PORT=3000
```

### Azure AD Configuration

For each Microsoft 365 tenant you want to connect:

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Create new registration
3. Add API permission: `Calendars.Read.Shared` (Application permission)
4. Grant admin consent
5. Create client secret
6. Note down: Tenant ID, Application ID, Client Secret

Then add the tenant via API:

```bash
curl -X POST http://localhost:3000/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Company",
    "domain": "mycompany.com",
    "azureTenantId": "xxx",
    "azureAppId": "xxx",
    "azureAppSecret": "xxx"
  }'
```

## API Endpoints

### Tenants
- `GET /api/tenants` - List all tenants
- `POST /api/tenants` - Create tenant
- `GET /api/tenants/:id` - Get tenant details
- `PATCH /api/tenants/:id` - Update tenant
- `DELETE /api/tenants/:id` - Delete tenant

### Persons
- `GET /api/persons` - List all persons
- `POST /api/persons` - Create person
- `GET /api/persons/:id` - Get person details
- `PATCH /api/persons/:id` - Update person
- `PATCH /api/persons/:id/working-hours` - Update working hours
- `POST /api/persons/:id/accounts` - Link account to person
- `DELETE /api/persons/:id/accounts/:accountId` - Unlink account
- `DELETE /api/persons/:id` - Delete person

### Schedule
- `POST /api/schedule/availability` - Get free/busy for multiple persons
- `GET /api/schedule/availability/:personId` - Get free/busy for one person

### Recommendations
- `POST /api/recommend` - Get recommended meeting times

## Example: Get Meeting Recommendations

```bash
curl -X POST http://localhost:3000/api/recommend \
  -H "Content-Type: application/json" \
  -d '{
    "personIds": ["person-uuid-1", "person-uuid-2"],
    "startTime": "2026-02-10T00:00:00Z",
    "endTime": "2026-02-14T23:59:59Z",
    "durationMinutes": 30
  }'
```

Response:
```json
{
  "recommendations": [
    {
      "start": "2026-02-10T14:00:00.000Z",
      "end": "2026-02-10T14:30:00.000Z",
      "score": 140,
      "allAvailable": true,
      "details": [
        {
          "personId": "...",
          "displayName": "Alice",
          "localTime": "Mon, Feb 10, 09:00",
          "status": "core",
          "isBusy": false
        }
      ]
    }
  ]
}
```

## Deployment (Railway)

1. Create new project on Railway
2. Add PostgreSQL service
3. Connect GitHub repository
4. Set environment variables
5. Deploy!

Railway will automatically:
- Detect Node.js project
- Run `npm install` and `npm run build`
- Start with `npm start`

## License

MIT
