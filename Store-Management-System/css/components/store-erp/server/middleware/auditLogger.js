const { query } = require('../config/db');

/**
 * Writes one row to audit_logs. Call this explicitly from controllers
 * after a successful mutating action (create/update/delete/sale/purchase/
 * payment/stock_adjustment/print/export/login/logout), so the description
 * can capture meaningful business context (e.g. "Sale INV-000123 completed").
 */
async function recordAudit({ req, action, module, entityId = null, description = '' }) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action, module, entity_id, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user ? req.user.id : null,
        action,
        module,
        entityId,
        description,
        req.ip,
        req.headers['user-agent'] || null,
      ]
    );
  } catch (err) {
    // Audit logging must never break the main request flow.
    console.error('Failed to write audit log:', err);
  }
}

module.exports = { recordAudit };
