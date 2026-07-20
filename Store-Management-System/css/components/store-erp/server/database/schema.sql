-- ============================================================
-- STORE INVENTORY & SALES MANAGEMENT SYSTEM - DATABASE SCHEMA
-- Engine: MySQL 8+
-- Charset: utf8mb4 (supports multi-language / multi-currency text)
-- ============================================================

CREATE DATABASE IF NOT EXISTS store_erp
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE store_erp;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================
-- 1. ROLES & PERMISSIONS
-- ============================================================

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,           -- Admin, Store Manager, Sales Manager, Salesman, Cashier, Accountant, Read-only User
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(100) NOT NULL UNIQUE,          -- e.g. 'products.create', 'sales.void', 'reports.view'
  module VARCHAR(50) NOT NULL,                -- e.g. 'products', 'sales', 'reports'
  description VARCHAR(255)
) ENGINE=InnoDB;

CREATE TABLE role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 2. USERS (Employees / System Accounts)
-- ============================================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(30) UNIQUE,           -- e.g. EMP-0001
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(30),
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  photo_url VARCHAR(255),
  address VARCHAR(255),
  salary DECIMAL(14,2) DEFAULT 0,
  commission_percent DECIMAL(5,2) DEFAULT 0,   -- for salesmen
  branch_id INT NULL,                          -- multi-branch support
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at DATETIME NULL,
  reset_token VARCHAR(255) NULL,
  reset_token_expires DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  INDEX idx_users_role (role_id),
  INDEX idx_users_active (is_active)
) ENGINE=InnoDB;

-- ============================================================
-- 3. BRANCHES (Multi-store support)
-- ============================================================

CREATE TABLE branches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255),
  phone VARCHAR(30),
  is_main BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

ALTER TABLE users
  ADD CONSTRAINT fk_users_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL;

-- ============================================================
-- 4. CATEGORIES / BRANDS / SUPPLIERS / CUSTOMERS
-- ============================================================

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  parent_id INT NULL,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE suppliers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  supplier_code VARCHAR(30) UNIQUE,
  name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(30),
  email VARCHAR(150),
  address VARCHAR(255),
  outstanding_balance DECIMAL(14,2) DEFAULT 0,  -- amount we owe supplier
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suppliers_name (name)
) ENGINE=InnoDB;

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_code VARCHAR(30) UNIQUE,             -- PID
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(30),
  email VARCHAR(150),
  address VARCHAR(255),
  credit_limit DECIMAL(14,2) DEFAULT 0,
  pending_balance DECIMAL(14,2) DEFAULT 0,
  last_purchase_at DATETIME NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_customers_phone (phone),
  INDEX idx_customers_name (name)
) ENGINE=InnoDB;

-- ============================================================
-- 5. PRODUCTS
-- ============================================================

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_code VARCHAR(30) UNIQUE,              -- auto-generated e.g. PRD-000123
  barcode VARCHAR(64) UNIQUE,
  qr_code VARCHAR(64) UNIQUE,
  name VARCHAR(200) NOT NULL,
  category_id INT NULL,
  brand_id INT NULL,
  supplier_id INT NULL,                         -- default/primary supplier
  unit VARCHAR(30) DEFAULT 'pcs',               -- pcs, kg, box, litre...
  purchase_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  selling_price DECIMAL(14,2) NOT NULL DEFAULT 0,
  wholesale_price DECIMAL(14,2) DEFAULT 0,
  retail_price DECIMAL(14,2) DEFAULT 0,
  minimum_price DECIMAL(14,2) DEFAULT 0,        -- floor price (cannot sell below without override)
  tax_percent DECIMAL(5,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  purchase_date DATE NULL,
  expiration_date DATE NULL,
  image_url VARCHAR(255),
  description TEXT,
  location VARCHAR(100),                        -- warehouse shelf/bin
  minimum_stock INT DEFAULT 0,
  maximum_stock INT DEFAULT 0,
  current_quantity INT NOT NULL DEFAULT 0,
  reserved_quantity INT NOT NULL DEFAULT 0,      -- reserved by pending orders
  status ENUM('active','inactive','discontinued') DEFAULT 'active',
  branch_id INT NULL,
  created_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_products_name (name),
  INDEX idx_products_barcode (barcode),
  INDEX idx_products_category (category_id),
  INDEX idx_products_status (status),
  -- available_quantity is derived at query time as (current_quantity - reserved_quantity)
  INDEX idx_products_stock (current_quantity)
) ENGINE=InnoDB;

-- Generated column for available quantity (read-only, always in sync)
ALTER TABLE products
  ADD COLUMN available_quantity INT AS (current_quantity - reserved_quantity) STORED;

-- ============================================================
-- 6. PURCHASES
-- ============================================================

CREATE TABLE purchases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  supplier_id INT NOT NULL,
  purchase_date DATE NOT NULL,
  expected_delivery DATE NULL,
  received_date DATE NULL,
  status ENUM('pending','received','partial','cancelled') DEFAULT 'pending',
  subtotal DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  amount_paid DECIMAL(14,2) DEFAULT 0,
  branch_id INT NULL,
  created_by INT NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_purchases_status (status),
  INDEX idx_purchases_supplier (supplier_id),
  INDEX idx_purchases_date (purchase_date)
) ENGINE=InnoDB;

CREATE TABLE purchase_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  purchase_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity_ordered INT NOT NULL,
  quantity_received INT DEFAULT 0,
  unit_cost DECIMAL(14,2) NOT NULL,
  tax_percent DECIMAL(5,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_purchase_items_purchase (purchase_id),
  INDEX idx_purchase_items_product (product_id)
) ENGINE=InnoDB;

-- ============================================================
-- 7. SALES
-- ============================================================

CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NULL,                          -- nullable for walk-in
  salesman_id INT NULL,
  branch_id INT NULL,
  sale_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  subtotal DECIMAL(14,2) DEFAULT 0,
  tax_amount DECIMAL(14,2) DEFAULT 0,
  discount_amount DECIMAL(14,2) DEFAULT 0,
  total_amount DECIMAL(14,2) DEFAULT 0,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  balance_due DECIMAL(14,2) DEFAULT 0,
  payment_method ENUM('cash','cbe','telebirr','boa','dashen','awash','cooperative','mpesa','other','pending') DEFAULT 'cash',
  custom_bank_name VARCHAR(100) NULL,            -- used when payment_method = 'other'
  status ENUM('draft','pending','completed','cancelled','returned') DEFAULT 'draft',
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_sales_status (status),
  INDEX idx_sales_date (sale_date),
  INDEX idx_sales_customer (customer_id),
  INDEX idx_sales_salesman (salesman_id),
  INDEX idx_sales_payment_method (payment_method)
) ENGINE=InnoDB;

CREATE TABLE sale_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(14,2) NOT NULL,
  unit_cost DECIMAL(14,2) NOT NULL DEFAULT 0,     -- snapshot of cost at sale time, for accurate profit calc
  tax_percent DECIMAL(5,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  line_total DECIMAL(14,2) NOT NULL,
  returned_quantity INT DEFAULT 0,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id),
  INDEX idx_sale_items_sale (sale_id),
  INDEX idx_sale_items_product (product_id)
) ENGINE=InnoDB;

-- ============================================================
-- 8. PAYMENTS & PENDING PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NULL,
  purchase_id INT NULL,
  customer_id INT NULL,
  supplier_id INT NULL,
  direction ENUM('in','out') NOT NULL,            -- in = received from customer, out = paid to supplier
  amount DECIMAL(14,2) NOT NULL,
  payment_method ENUM('cash','cbe','telebirr','boa','dashen','awash','cooperative','mpesa','other') NOT NULL,
  custom_bank_name VARCHAR(100) NULL,
  reference_number VARCHAR(100) NULL,
  paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  recorded_by INT NOT NULL,
  notes VARCHAR(255),
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  FOREIGN KEY (recorded_by) REFERENCES users(id),
  INDEX idx_payments_method (payment_method),
  INDEX idx_payments_date (paid_at),
  INDEX idx_payments_direction (direction)
) ENGINE=InnoDB;

CREATE TABLE pending_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  pid VARCHAR(30) NOT NULL UNIQUE,                -- human-readable pending ID
  sale_id INT NOT NULL,
  customer_id INT NOT NULL,
  salesman_id INT NULL,
  pending_amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) DEFAULT 0,
  remaining_balance DECIMAL(14,2) AS (pending_amount - paid_amount) STORED,
  expected_date DATE NULL,
  reminder_date DATE NULL,
  status ENUM('waiting','partially_paid','paid','cancelled') DEFAULT 'waiting',
  remarks VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (salesman_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_pending_status (status),
  INDEX idx_pending_customer (customer_id)
) ENGINE=InnoDB;

-- ============================================================
-- 9. INVENTORY MOVEMENTS
-- ============================================================

CREATE TABLE inventory_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  change_type ENUM('purchase_in','sale_out','return_in','return_out','adjustment','transfer_in','transfer_out','damaged','lost','expired') NOT NULL,
  quantity_change INT NOT NULL,                   -- positive or negative
  quantity_before INT NOT NULL,
  quantity_after INT NOT NULL,
  reference_type VARCHAR(30),                     -- 'purchase','sale','adjustment','transfer','return'
  reference_id INT NULL,
  branch_id INT NULL,
  performed_by INT NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (performed_by) REFERENCES users(id),
  INDEX idx_inv_history_product (product_id),
  INDEX idx_inv_history_type (change_type),
  INDEX idx_inv_history_date (created_at)
) ENGINE=InnoDB;

CREATE TABLE stock_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  adjustment_type ENUM('increase','decrease') NOT NULL,
  quantity INT NOT NULL,
  reason ENUM('damaged','lost','expired','manual_correction','audit') NOT NULL,
  notes VARCHAR(255),
  performed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (performed_by) REFERENCES users(id),
  INDEX idx_stock_adj_product (product_id)
) ENGINE=InnoDB;

CREATE TABLE stock_transfers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  from_branch_id INT NOT NULL,
  to_branch_id INT NOT NULL,
  quantity INT NOT NULL,
  status ENUM('pending','completed','cancelled') DEFAULT 'pending',
  requested_by INT NOT NULL,
  received_by INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (from_branch_id) REFERENCES branches(id),
  FOREIGN KEY (to_branch_id) REFERENCES branches(id),
  FOREIGN KEY (requested_by) REFERENCES users(id),
  FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Batches for FIFO costing (each purchase-received lot tracked separately)
CREATE TABLE inventory_batches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  purchase_item_id INT NULL,
  quantity_received INT NOT NULL,
  quantity_remaining INT NOT NULL,
  unit_cost DECIMAL(14,2) NOT NULL,
  received_date DATE NOT NULL,
  expiration_date DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (purchase_item_id) REFERENCES purchase_items(id) ON DELETE SET NULL,
  INDEX idx_batches_product_fifo (product_id, received_date),
  INDEX idx_batches_remaining (quantity_remaining)
) ENGINE=InnoDB;

-- ============================================================
-- 10. RETURNS
-- ============================================================

CREATE TABLE returns (
  id INT AUTO_INCREMENT PRIMARY KEY,
  return_type ENUM('sale_return','purchase_return') NOT NULL,
  sale_id INT NULL,
  purchase_id INT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  reason VARCHAR(255),
  refund_amount DECIMAL(14,2) DEFAULT 0,
  processed_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE SET NULL,
  FOREIGN KEY (product_id) REFERENCES products(id),
  FOREIGN KEY (processed_by) REFERENCES users(id),
  INDEX idx_returns_type (return_type)
) ENGINE=InnoDB;

-- ============================================================
-- 11. EXPENSES & INCOME
-- ============================================================

CREATE TABLE expenses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('rent','salary','transport','electricity','water','internet','maintenance','tax','office_supplies','marketing','miscellaneous') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  expense_date DATE NOT NULL,
  receipt_url VARCHAR(255),
  remarks VARCHAR(255),
  branch_id INT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_expenses_category (category),
  INDEX idx_expenses_date (expense_date)
) ENGINE=InnoDB;

CREATE TABLE income (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category ENUM('investment','other_income','bank_deposit','cash_deposit','interest','miscellaneous') NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  income_date DATE NOT NULL,
  remarks VARCHAR(255),
  branch_id INT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_income_category (category),
  INDEX idx_income_date (income_date)
) ENGINE=InnoDB;

-- ============================================================
-- 12. CASH DRAWER (Daily Opening / Closing / Reconciliation)
-- ============================================================

CREATE TABLE cash_drawer_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  branch_id INT NULL,
  opened_by INT NOT NULL,
  closed_by INT NULL,
  opening_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  expected_closing_amount DECIMAL(14,2) NULL,
  actual_closing_amount DECIMAL(14,2) NULL,
  discrepancy DECIMAL(14,2) NULL,
  opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  status ENUM('open','closed') DEFAULT 'open',
  notes VARCHAR(255),
  FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE SET NULL,
  FOREIGN KEY (opened_by) REFERENCES users(id),
  FOREIGN KEY (closed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- 13. INVOICES (rendered/printed invoice records, links sale -> PDF)
-- ============================================================

CREATE TABLE invoices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL UNIQUE,
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  pdf_url VARCHAR(255) NULL,
  printed_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- 14. NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,                              -- NULL = broadcast to all admins/managers
  type ENUM('low_stock','out_of_stock','expired_product','near_expiry','pending_payment','large_sale','failed_transaction','daily_closing_reminder','backup_reminder','other') NOT NULL,
  title VARCHAR(150) NOT NULL,
  message VARCHAR(500) NOT NULL,
  reference_type VARCHAR(30) NULL,
  reference_id INT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_notifications_user (user_id),
  INDEX idx_notifications_type (type),
  INDEX idx_notifications_read (is_read)
) ENGINE=InnoDB;

-- ============================================================
-- 15. SETTINGS
-- ============================================================

CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value TEXT,
  description VARCHAR(255),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- 16. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(50) NOT NULL,                   -- login, logout, create, update, delete, sale, purchase, payment, stock_adjustment, print, export
  module VARCHAR(50) NOT NULL,                   -- products, sales, purchases, users, ...
  entity_id INT NULL,
  description VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_user (user_id),
  INDEX idx_audit_action (action),
  INDEX idx_audit_date (created_at)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;
