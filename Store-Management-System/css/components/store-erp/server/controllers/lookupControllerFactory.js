const { query } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('../middleware/auditLogger');

/**
 * Builds a standard set of list/create/update/delete handlers for a
 * simple lookup table shaped like (id, name, description, created_at).
 * Used for Categories and Brands, which share identical CRUD semantics.
 */
function buildLookupController({ table, moduleName, extraColumns = [] }) {
  const allColumns = ['name', 'description', ...extraColumns];

  async function list(req, res, next) {
    try {
      const rows = await query(`SELECT * FROM ${table} ORDER BY name ASC`);
      res.json({ success: true, data: rows });
    } catch (err) {
      next(err);
    }
  }

  async function create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) throw new AppError('Name is required.', 400);

      const values = allColumns.map((col) => req.body[toCamelCase(col)] ?? null);
      const placeholders = allColumns.map(() => '?').join(', ');
      const result = await query(
        `INSERT INTO ${table} (${allColumns.join(', ')}) VALUES (${placeholders})`,
        values
      );

      await recordAudit({ req, action: 'create', module: moduleName, entityId: result.insertId, description: `Created ${moduleName.slice(0, -1)} "${name}"` });
      res.status(201).json({ success: true, data: { id: result.insertId, ...req.body } });
    } catch (err) {
      next(err);
    }
  }

  async function update(req, res, next) {
    try {
      const setClauses = allColumns.map((col) => `${col} = COALESCE(?, ${col})`).join(', ');
      const values = allColumns.map((col) => req.body[toCamelCase(col)] ?? null);

      const result = await query(`UPDATE ${table} SET ${setClauses} WHERE id = ?`, [...values, req.params.id]);
      if (!result.affectedRows) throw new AppError('Record not found.', 404);

      await recordAudit({ req, action: 'update', module: moduleName, entityId: req.params.id, description: `Updated ${moduleName.slice(0, -1)} #${req.params.id}` });
      res.json({ success: true, message: 'Updated successfully.' });
    } catch (err) {
      next(err);
    }
  }

  async function remove(req, res, next) {
    try {
      const result = await query(`DELETE FROM ${table} WHERE id = ?`, [req.params.id]);
      if (!result.affectedRows) throw new AppError('Record not found.', 404);

      await recordAudit({ req, action: 'delete', module: moduleName, entityId: req.params.id, description: `Deleted ${moduleName.slice(0, -1)} #${req.params.id}` });
      res.json({ success: true, message: 'Deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }

  return { list, create, update, remove };
}

function toCamelCase(snake) {
  return snake.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

module.exports = { buildLookupController };
