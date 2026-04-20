const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes         = require('./routes/auth');
const profileRoutes      = require('./routes/profile');
const problemRoutes      = require('./routes/problems');
const solutionRoutes     = require('./routes/solutions');
const groupRoutes        = require('./routes/groups');
const moderationRoutes   = require('./routes/moderation');
const notificationRoutes = require('./routes/notifications');
const exportRoutes       = require('./routes/export');
const leaderboardRoutes  = require('./routes/leaderboard');
const commentRoutes      = require('./routes/comments');
const bookmarkRoutes     = require('./routes/bookmarks');
const reportRoutes       = require('./routes/reports');
const adminRoutes        = require('./routes/admin');
const feedRoutes         = require('./routes/feed');
const oauthRoutes        = require('./routes/oauth');
const pushRoutes         = require('./routes/push');
const pollRoutes         = require('./routes/polls');

const app = express();

app.set('trust proxy', 1); // Required for rate limiting behind Railway's proxy
app.use(cors());
app.use(express.json());

// Strict rate limit for auth endpoints (login, register, forgot-password)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { error: 'Too many requests. Please wait 15 minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth',          authLimiter, authRoutes);
app.use('/api/profile',       apiLimiter,  profileRoutes);
app.use('/api/problems',      apiLimiter,  problemRoutes);
app.use('/api/problems',      apiLimiter,  solutionRoutes);
app.use('/api/groups',        apiLimiter, groupRoutes);
app.use('/api/moderation',    apiLimiter, moderationRoutes);
app.use('/api/notifications', apiLimiter, notificationRoutes);
app.use('/api/export',        apiLimiter, exportRoutes);
app.use('/api/leaderboard',   apiLimiter, leaderboardRoutes);
app.use('/api/solutions',     apiLimiter, commentRoutes);
app.use('/api/bookmarks',     apiLimiter, bookmarkRoutes);
app.use('/api/reports',       apiLimiter, reportRoutes);
app.use('/api/admin',         apiLimiter, adminRoutes);
app.use('/api/feed',          apiLimiter, feedRoutes);
app.use('/api/auth',          authLimiter, oauthRoutes);
app.use('/api/push',          apiLimiter,  pushRoutes);
app.use('/api/solutions',     apiLimiter,  pollRoutes);

app.get('/api/test', (req, res) => {
  res.json({ message: 'HiveCollective API is running.' });
});

process.on('uncaughtException', err => {
  console.error('UNCAUGHT EXCEPTION:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
