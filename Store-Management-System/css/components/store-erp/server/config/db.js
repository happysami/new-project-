// ============================================================
// MySQL connection pool
// All queries in the app should go through this pool so that
// connections are reused and released properly.
// ============================================================
require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'store_erp',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  decimalNumbers: true, // return DECIMAL columns as JS numbers instead of strings
});

// Simple helper to run a query with automatic connection release
async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

// Helper to run a set of operations inside a transaction.
// `work` receives a connection and must use conn.execute(...) for all queries.
async function withTransaction(work) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, query, withTransaction };
