const bcrypt = require('bcryptjs');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('../middleware/auditLogger');

function nextEmployeeCode(lastCode) {
  const lastNum = lastCode ? parseInt(lastCode.split('-')[1], 10) : 0;
  return `EMP-${String(lastNum + 1).padStart(4, '0')}`;
}

// GET /api/users?page=1&limit=20&search=&roleId=
async function listUsers(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search ? `%${req.query.search}%` : null;
    const roleId = req.query.roleId || null;

    const where = [];
    const params = [];
    if (search) {
      where.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.employee_code LIKE ?)');
      params.push(search, search, search);
    }
    if (roleId) {
      where.push('u.role_id = ?');
      params.push(roleId);
    }
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT u.id, u.employee_code, u.full_name, u.email, u.phone, u.photo_url,
              u.salary, u.commission_percent, u.is_active, u.last_login_at,
              r.id AS role_id, r.name AS role_name, b.name AS branch_name
       FROM users u
       JOIN roles r ON r.id = u.role_id
       LEFT JOIN branches b ON b.id = u.branch_id
       ${whereClause}
       ORDER BY u.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM users u ${whereClause}`, params);

    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

// GET /api/users/:id
async function getUser(req, res, next) {
  try {
    const rows = await query(
      `SELECT u.id, u.employee_code, u.full_name, u.email, u.phone, u.address, u.photo_url,
              u.salary, u.commission_percent, u.is_active, u.last_login_at, u.created_at,
              r.id AS role_id, r.name AS role_name, u.branch_id
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) throw new AppError('User not found.', 404);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

// POST /api/users
async function createUser(req, res, next) {
  try {
    const { fullName, email, phone, password, roleId, branchId, address, salary, commissionPercent } = req.body;
    if (!fullName || !email || !password || !roleId) {
      throw new AppError('Full name, email, password, and role are required.', 400);
    }
    if (password.length < 8) throw new AppError('Password must be at least 8 characters.', 400);

    const existing = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email]);
    if (existing.length) throw new AppError('A user with this email already exists.', 409);

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = await withTransaction(async (conn) => {
      const [lastRows] = await conn.execute('SELECT employee_code FROM users ORDER BY id DESC LIMIT 1');
      const employeeCode = nextEmployeeCode(lastRows[0]?.employee_code);

      const [result] = await conn.execute(
        `INSERT INTO users (employee_code, full_name, email, phone, password_hash, role_id, branch_id, address, salary, commission_percent, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [employeeCode, fullName, email, phone || null, passwordHash, roleId, branchId || null, address || null, salary || 0, commissionPercent || 0]
      );
      return { id: result.insertId, employeeCode };
    });

    await recordAudit({ req, action: 'create', module: 'users', entityId: newUser.id, description: `Created user ${fullName} (${email})` });

    res.status(201).json({ success: true, data: newUser });
  } catch (err) {
    next(err);
  }
}

// PUT /api/users/:id
async function updateUser(req, res, next) {
  try {
    const { fullName, phone, roleId, branchId, address, salary, commissionPercent } = req.body;
    const rows = await query('SELECT id FROM users WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows.length) throw new AppError('User not found.', 404);

    await query(
      `UPDATE users SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone),
       role_id = COALESCE(?, role_id), branch_id = COALESCE(?, branch_id),
       address = COALESCE(?, address), salary = COALESCE(?, salary),
       commission_percent = COALESCE(?, commission_percent)
       WHERE id = ?`,
      [fullName, phone, roleId, branchId, address, salary, commissionPercent, req.params.id]
    );

    await recordAudit({ req, action: 'update', module: 'users', entityId: req.params.id, description: `Updated user #${req.params.id}` });
    res.json({ success: true, message: 'User updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/deactivate
async function deactivateUser(req, res, next) {
  try {
    if (Number(req.params.id) === req.user.id) {
      throw new AppError('You cannot deactivate your own account.', 400);
    }
    const result = await query('UPDATE users SET is_active = FALSE WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw new AppError('User not found.', 404);

    await recordAudit({ req, action: 'update', module: 'users', entityId: req.params.id, description: `Deactivated user #${req.params.id}` });
    res.json({ success: true, message: 'User deactivated.' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/users/:id/activate
async function activateUser(req, res, next) {
  try {
    const result = await query('UPDATE users SET is_active = TRUE WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw new AppError('User not found.', 404);

    await recordAudit({ req, action: 'update', module: 'users', entityId: req.params.id, description: `Reactivated user #${req.params.id}` });
    res.json({ success: true, message: 'User reactivated.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { listUsers, getUser, createUser, updateUser, deactivateUser, activateUser };
