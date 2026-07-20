-- ============================================================
-- SEED DATA: Roles, Permissions, Default Branch, Default Admin
-- Run AFTER schema.sql
-- ============================================================
USE store_erp;

-- ---------- Roles ----------
INSERT INTO roles (name, description) VALUES
  ('Admin', 'Full system access'),
  ('Store Manager', 'Manages inventory, purchases, and stock'),
  ('Sales Manager', 'Manages sales team, targets and reports'),
  ('Salesman', 'Creates sales and views own performance'),
  ('Cashier', 'Handles point-of-sale and payments'),
  ('Accountant', 'Handles expenses, income, and financial reports'),
  ('Read-only User', 'View-only access to reports and dashboards');

-- ---------- Permissions (module.action) ----------
INSERT INTO permissions (code, module, description) VALUES
  ('products.view','products','View products'),
  ('products.create','products','Create products'),
  ('products.update','products','Edit products'),
  ('products.delete','products','Delete products'),
  ('purchases.view','purchases','View purchase orders'),
  ('purchases.create','purchases','Create purchase orders'),
  ('purchases.receive','purchases','Receive purchase deliveries'),
  ('purchases.cancel','purchases','Cancel purchase orders'),
  ('sales.view','sales','View sales'),
  ('sales.create','sales','Create sales'),
  ('sales.void','sales','Cancel/void a sale'),
  ('sales.return','sales','Process a sale return'),
  ('inventory.view','inventory','View inventory'),
  ('inventory.adjust','inventory','Adjust stock levels'),
  ('inventory.transfer','inventory','Transfer stock between branches'),
  ('customers.manage','customers','Manage customer records'),
  ('suppliers.manage','suppliers','Manage supplier records'),
  ('users.manage','users','Manage system users and roles'),
  ('expenses.manage','expenses','Manage expenses'),
  ('income.manage','income','Manage income records'),
  ('reports.view','reports','View reports'),
  ('reports.export','reports','Export reports'),
  ('settings.manage','settings','Manage system settings'),
  ('audit.view','audit','View audit logs');

-- ---------- Role -> Permission mapping ----------
-- Admin: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Admin'), id FROM permissions;

-- Store Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Store Manager'), id FROM permissions
WHERE code IN ('products.view','products.create','products.update','products.delete',
  'purchases.view','purchases.create','purchases.receive','purchases.cancel',
  'inventory.view','inventory.adjust','inventory.transfer','suppliers.manage',
  'reports.view','reports.export');

-- Sales Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Sales Manager'), id FROM permissions
WHERE code IN ('sales.view','sales.create','sales.void','sales.return',
  'customers.manage','products.view','inventory.view','reports.view','reports.export');

-- Salesman
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Salesman'), id FROM permissions
WHERE code IN ('sales.view','sales.create','products.view','customers.manage');

-- Cashier
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Cashier'), id FROM permissions
WHERE code IN ('sales.view','sales.create','sales.return','products.view');

-- Accountant
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Accountant'), id FROM permissions
WHERE code IN ('expenses.manage','income.manage','reports.view','reports.export','sales.view','purchases.view');

-- Read-only User
INSERT INTO role_permissions (role_id, permission_id)
SELECT (SELECT id FROM roles WHERE name = 'Read-only User'), id FROM permissions
WHERE code IN ('products.view','sales.view','purchases.view','inventory.view','reports.view');

-- ---------- Default Branch ----------
INSERT INTO branches (name, address, is_main) VALUES ('Main Branch', 'Addis Ababa, Ethiopia', TRUE);

-- ---------- Default Admin User ----------
-- NOTE: Do NOT insert the admin user with a hardcoded password hash here.
-- Run `npm run create-admin` after `npm install` (see database/createAdmin.js).
-- That script bcrypt-hashes a password you choose interactively and inserts
-- the Admin user safely, avoiding a known/shared password hash in source control.

-- ---------- Default Settings ----------
INSERT INTO settings (setting_key, setting_value, description) VALUES
  ('company_name', 'My Store', 'Company name shown on invoices'),
  ('company_address', 'Addis Ababa, Ethiopia', 'Company address'),
  ('default_currency', 'ETB', 'Default currency code'),
  ('default_tax_percent', '15', 'Default VAT percentage'),
  ('low_stock_threshold_days', '7', 'Days of stock cover before low-stock alert'),
  ('near_expiry_days', '30', 'Days before expiration to trigger near-expiry alert'),
  ('invoice_prefix', 'INV-', 'Prefix used for invoice numbers'),
  ('purchase_prefix', 'PO-', 'Prefix used for purchase order numbers');
