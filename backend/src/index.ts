import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import mongoose from 'mongoose';

import { authRouter } from '@api/auth';
import { exerciseRouter } from '@api/exercise';
import { userRouter } from '@api/user';
import { workoutRouter } from '@api/workout';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/motriforge';
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Create the Hono app
const app = new Hono();

// Apply middleware
app.use('*', logger());
app.use('*', cors());

// Define API version
const api = new Hono();

// Define API routes
api.route('/auth', authRouter);
api.route('/users', userRouter);
api.route('/exercises', exerciseRouter);
api.route('/workouts', workoutRouter);

// Mount API under /api route
app.route('/api', api);

// Health check endpoint
app.get('/health', c => c.json({ status: 'ok' }));

// Start the server
const PORT = process.env.PORT || 3001;
console.log(`Server is running on port ${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch
};