const jwt = require('jsonwebtoken');
const { query } = require('../config/db');

/**
 * Verifies the JWT access token sent in the Authorization header
 * (format: "Bearer <token>") and attaches the authenticated user's
 * id, role, and permission codes to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication token missing.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const message = err.name === 'TokenExpiredError' ? 'Session expired, please log in again.' : 'Invalid authentication token.';
      return res.status(401).json({ success: false, message });
    }

    // Load fresh user data + permissions on every request so that
    // deactivated accounts or changed roles take effect immediately.
    const users = await query(
      `SELECT u.id, u.full_name, u.email, u.role_id, u.branch_id, u.is_active, r.name AS role_name
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? LIMIT 1`,
      [payload.userId]
    );

    if (!users.length || !users[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account not found or deactivated.' });
    }

    const permissionRows = await query(
      `SELECT p.code FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE rp.role_id = ?`,
      [users[0].role_id]
    );

    req.user = {
      id: users[0].id,
      fullName: users[0].full_name,
      email: users[0].email,
      roleId: users[0].role_id,
      roleName: users[0].role_name,
      branchId: users[0].branch_id,
      permissions: permissionRows.map((p) => p.code),
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Restricts a route to users holding ALL of the given permission codes.
 * Usage: authorize('products.create')
 */
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    const hasAll = requiredPermissions.every((perm) => req.user.permissions.includes(perm));
    if (!hasAll) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

/** Restricts a route to specific role names, e.g. requireRole('Admin', 'Store Manager') */
function requireRole(...roleNames) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated.' });
    }
    if (!roleNames.includes(req.user.roleName)) {
      return res.status(403).json({ success: false, message: 'Your role does not have access to this resource.' });
    }
    next();
  };
}

module.exports = { authenticate, authorize, requireRole };
