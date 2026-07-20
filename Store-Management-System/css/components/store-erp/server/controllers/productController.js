const crypto = require('crypto');
const { query, withTransaction } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');
const { recordAudit } = require('../middleware/auditLogger');

// Generates a sequential, human-friendly product code like PRD-000123
function nextProductCode(lastCode) {
  const lastNum = lastCode ? parseInt(lastCode.split('-')[1], 10) : 0;
  return `PRD-${String(lastNum + 1).padStart(6, '0')}`;
}

// Generates a unique numeric barcode (EAN-13 style: 12 digits + check digit)
function generateBarcode() {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  const checkDigit =
    (10 -
      (digits.reduce((sum, d, i) => sum + d * (i % 2 === 0 ? 1 : 3), 0) % 10)) %
    10;
  return digits.join('') + checkDigit;
}

// The QR code simply encodes the product code + barcode as a string;
// actual QR image rendering happens client-side (e.g. with the `qrcode`
// npm package or a frontend QR library) using this value as the payload.
function generateQrPayload(productCode, barcode) {
  return `${productCode}|${barcode}`;
}

// GET /api/products?page=&limit=&search=&categoryId=&brandId=&supplierId=&status=&lowStock=&nearExpiry=
async function listProducts(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    const where = [];
    const params = [];

    if (req.query.search) {
      where.push('(p.name LIKE ? OR p.product_code LIKE ? OR p.barcode LIKE ?)');
      const term = `%${req.query.search}%`;
      params.push(term, term, term);
    }
    if (req.query.categoryId) {
      where.push('p.category_id = ?');
      params.push(req.query.categoryId);
    }
    if (req.query.brandId) {
      where.push('p.brand_id = ?');
      params.push(req.query.brandId);
    }
    if (req.query.supplierId) {
      where.push('p.supplier_id = ?');
      params.push(req.query.supplierId);
    }
    if (req.query.status) {
      where.push('p.status = ?');
      params.push(req.query.status);
    }
    if (req.query.lowStock === 'true') {
      where.push('p.current_quantity <= p.minimum_stock');
    }
    if (req.query.outOfStock === 'true') {
      where.push('p.current_quantity <= 0');
    }
    if (req.query.nearExpiry === 'true') {
      where.push('p.expiration_date IS NOT NULL AND p.expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
    }
    if (req.query.expired === 'true') {
      where.push('p.expiration_date IS NOT NULL AND p.expiration_date < CURDATE()');
    }

    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const rows = await query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       ${whereClause}
       ORDER BY p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [{ total }] = await query(`SELECT COUNT(*) AS total FROM products p ${whereClause}`, params);

    res.json({ success: true, data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/:id
async function getProduct(req, res, next) {
  try {
    const rows = await query(
      `SELECT p.*, c.name AS category_name, b.name AS brand_name, s.name AS supplier_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN suppliers s ON s.id = p.supplier_id
       WHERE p.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) throw new AppError('Product not found.', 404);

    const history = await query(
      `SELECT ih.*, u.full_name AS performed_by_name
       FROM inventory_history ih
       LEFT JOIN users u ON u.id = ih.performed_by
       WHERE ih.product_id = ?
       ORDER BY ih.created_at DESC LIMIT 50`,
      [req.params.id]
    );

    res.json({ success: true, data: { ...rows[0], history } });
  } catch (err) {
    next(err);
  }
}

// POST /api/products
async function createProduct(req, res, next) {
  try {
    const {
      name, categoryId, brandId, supplierId, unit, purchasePrice, sellingPrice,
      wholesalePrice, retailPrice, minimumPrice, taxPercent, discountPercent,
      purchaseDate, expirationDate, description, location, minimumStock,
      maximumStock, branchId, barcode: providedBarcode,
    } = req.body;

    if (!name) throw new AppError('Product name is required.', 400);
    if (purchasePrice == null || sellingPrice == null) {
      throw new AppError('Purchase price and selling price are required.', 400);
    }

    const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;

    const product = await withTransaction(async (conn) => {
      const [lastRows] = await conn.execute('SELECT product_code FROM products ORDER BY id DESC LIMIT 1');
      const productCode = nextProductCode(lastRows[0]?.product_code);
      const barcode = providedBarcode || generateBarcode();
      const qrCode = generateQrPayload(productCode, barcode);

      const [result] = await conn.execute(
        `INSERT INTO products (
          product_code, barcode, qr_code, name, category_id, brand_id, supplier_id, unit,
          purchase_price, selling_price, wholesale_price, retail_price, minimum_price,
          tax_percent, discount_percent, purchase_date, expiration_date, image_url,
          description, location, minimum_stock, maximum_stock, current_quantity,
          reserved_quantity, status, branch_id, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 'active', ?, ?)`,
        [
          productCode, barcode, qrCode, name, categoryId || null, brandId || null, supplierId || null,
          unit || 'pcs', purchasePrice, sellingPrice, wholesalePrice || 0, retailPrice || 0,
          minimumPrice || 0, taxPercent || 0, discountPercent || 0, purchaseDate || null,
          expirationDate || null, imageUrl, description || null, location || null,
          minimumStock || 0, maximumStock || 0, branchId || null, req.user.id,
        ]
      );
      return { id: result.insertId, productCode, barcode, qrCode };
    });

    await recordAudit({ req, action: 'create', module: 'products', entityId: product.id, description: `Created product "${name}" (${product.productCode})` });

    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

// PUT /api/products/:id
async function updateProduct(req, res, next) {
  try {
    const existing = await query('SELECT id, image_url FROM products WHERE id = ? LIMIT 1', [req.params.id]);
    if (!existing.length) throw new AppError('Product not found.', 404);

    const {
      name, categoryId, brandId, supplierId, unit, purchasePrice, sellingPrice,
      wholesalePrice, retailPrice, minimumPrice, taxPercent, discountPercent,
      purchaseDate, expirationDate, description, location, minimumStock,
      maximumStock, status,
    } = req.body;

    const imageUrl = req.file ? `/uploads/products/${req.file.filename}` : null;

    await query(
      `UPDATE products SET
        name = COALESCE(?, name), category_id = ?, brand_id = ?, supplier_id = ?,
        unit = COALESCE(?, unit), purchase_price = COALESCE(?, purchase_price),
        selling_price = COALESCE(?, selling_price), wholesale_price = COALESCE(?, wholesale_price),
        retail_price = COALESCE(?, retail_price), minimum_price = COALESCE(?, minimum_price),
        tax_percent = COALESCE(?, tax_percent), discount_percent = COALESCE(?, discount_percent),
        purchase_date = COALESCE(?, purchase_date), expiration_date = COALESCE(?, expiration_date),
        image_url = COALESCE(?, image_url), description = COALESCE(?, description),
        location = COALESCE(?, location), minimum_stock = COALESCE(?, minimum_stock),
        maximum_stock = COALESCE(?, maximum_stock), status = COALESCE(?, status)
       WHERE id = ?`,
      [
        name, categoryId || null, brandId || null, supplierId || null, unit, purchasePrice,
        sellingPrice, wholesalePrice, retailPrice, minimumPrice, taxPercent, discountPercent,
        purchaseDate, expirationDate, imageUrl, description, location, minimumStock,
        maximumStock, status, req.params.id,
      ]
    );

    await recordAudit({ req, action: 'update', module: 'products', entityId: req.params.id, description: `Updated product #${req.params.id}` });
    res.json({ success: true, message: 'Product updated successfully.' });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/products/:id
// Products referenced by sales/purchases are never hard-deleted (to preserve
// historical accuracy of past invoices) - they are marked 'discontinued' instead.
async function deleteProduct(req, res, next) {
  try {
    const referenced = await query(
      `SELECT
        (SELECT COUNT(*) FROM sale_items WHERE product_id = ?) +
        (SELECT COUNT(*) FROM purchase_items WHERE product_id = ?) AS ref_count`,
      [req.params.id, req.params.id]
    );

    if (referenced[0].ref_count > 0) {
      const result = await query("UPDATE products SET status = 'discontinued' WHERE id = ?", [req.params.id]);
      if (!result.affectedRows) throw new AppError('Product not found.', 404);
      await recordAudit({ req, action: 'update', module: 'products', entityId: req.params.id, description: `Discontinued product #${req.params.id} (has transaction history)` });
      return res.json({ success: true, message: 'Product has transaction history and was marked as discontinued instead of deleted.' });
    }

    const result = await query('DELETE FROM products WHERE id = ?', [req.params.id]);
    if (!result.affectedRows) throw new AppError('Product not found.', 404);

    await recordAudit({ req, action: 'delete', module: 'products', entityId: req.params.id, description: `Deleted product #${req.params.id}` });
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

// GET /api/products/alerts/summary - counts for dashboard widgets
async function alertsSummary(req, res, next) {
  try {
    const [rows] = await Promise.all([
      query(`SELECT
        SUM(CASE WHEN current_quantity <= minimum_stock AND current_quantity > 0 THEN 1 ELSE 0 END) AS low_stock,
        SUM(CASE WHEN current_quantity <= 0 THEN 1 ELSE 0 END) AS out_of_stock,
        SUM(CASE WHEN expiration_date IS NOT NULL AND expiration_date < CURDATE() THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN expiration_date IS NOT NULL AND expiration_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS near_expiry
       FROM products WHERE status = 'active'`),
    ]);
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
}

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, alertsSummary };
