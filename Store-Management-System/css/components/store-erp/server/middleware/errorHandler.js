// ============================================================
// Centralized error handler. Every controller should forward
// errors via next(err) instead of sending its own 500 response,
// so logging and formatting stay consistent everywhere.
// ============================================================

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

function notFound(req, res) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.originalUrl} ->`, err);

  // MySQL duplicate entry
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'A record with this value already exists.' });
  }
  // MySQL foreign key violation
  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(409).json({ success: false, message: 'This action conflicts with related records.' });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && !err.isOperational ? { stack: err.stack } : {}),
  });
}

module.exports = { AppError, notFound, errorHandler };
