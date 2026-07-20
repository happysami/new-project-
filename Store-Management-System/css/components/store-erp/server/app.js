require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const path = require('path');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const brandRoutes = require('./routes/brandRoutes');
const productRoutes = require('./routes/productRoutes');

const app = express();

// ---------- Security & core middleware ----------
app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(apiLimiter);

// ---------- Static file serving for uploaded images/receipts ----------
app.use('/uploads', express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads')));

// ---------- Health check ----------
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'Store ERP API is running.', timestamp: new Date().toISOString() });
});

// ---------- API routes ----------
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/products', productRoutes);

// Additional module routes (purchases, sales, inventory, customers, suppliers,
// expenses, income, payments, reports, dashboard, notifications, audit, settings)
// are added here in subsequent phases following the same pattern.

// ---------- 404 & error handling (must be last) ----------
app.use(notFound);
app.use(errorHandler);

module.exports = app;
