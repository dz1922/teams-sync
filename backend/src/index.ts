import 'isomorphic-fetch';
import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import tenantsRouter from './routes/tenants';
import personsRouter from './routes/persons';
import scheduleRouter from './routes/schedule';
import recommendRouter from './routes/recommend';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Database setup endpoint (one-time use)
app.post('/api/setup', async (req, res) => {
  try {
    const { execSync } = await import('child_process');
    const output = execSync('npx prisma db push --accept-data-loss', { 
      encoding: 'utf-8',
      timeout: 60000 
    });
    res.json({ success: true, output });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stderr: error.stderr });
  }
});

// API routes
app.use('/api/tenants', tenantsRouter);
app.use('/api/persons', personsRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/recommend', recommendRouter);

// Serve static frontend files
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`🚀 MeetSync server running on port ${PORT}`);
});
