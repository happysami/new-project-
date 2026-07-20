require('dotenv').config();
const app = require('./app');
const { pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    // Verify the database is reachable before accepting traffic.
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    console.log('Connected to MySQL database.');
  } catch (err) {
    console.error('Failed to connect to MySQL. Check your .env DB_* settings.', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Store ERP API listening on port ${PORT} (${process.env.NODE_ENV || 'development'} mode)`);
  });
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

start();
