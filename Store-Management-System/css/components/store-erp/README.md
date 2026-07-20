# Store Inventory & Sales Management System

An enterprise-style ERP for retail businesses — inventory, purchasing, sales,
payments, customers, suppliers, expenses/income, and reporting — built with
Node.js/Express, MySQL, and vanilla JS on the frontend.

## Status: Phase 1–3 complete (Foundation, Auth & Products)

This is being built following the exact step order requested:

1. ✅ **Database schema** — `server/database/schema.sql` (23 normalized tables, FKs, indexes)
2. ✅ **Backend APIs** — Express app, MVC structure, error handling, audit logging
3. ✅ **Authentication** — JWT (access + refresh), bcrypt, forgot/reset/change password, role & permission middleware, rate limiting
4. ✅ Products module (as the first fully-wired example of the pattern: CRUD, image upload, barcode/QR generation, low-stock/expiry alerts)
5. ⬜ Inventory (adjustments, transfers, FIFO batches, audit)
6. ⬜ Purchases (orders, receiving, partial delivery, auto stock update)
7. ⬜ Sales (POS flow, draft/pending/completed/returned status, auto stock reduce/restore)
8. ⬜ Payments, Pending Payments, Customers, Suppliers, Salesmen, Expenses, Income
9. ⬜ Dashboard aggregation endpoints + Reports (sales/inventory/profit/tax/etc.)
10. ⬜ Export (Excel/CSV/PDF) & Invoice generation
11. ⬜ Frontend UI (HTML/CSS/vanilla JS, Chart.js dashboards)
12. ⬜ Testing

Each remaining phase will be added as its own controller + routes + (where
needed) schema additions, following the same conventions already established
so the codebase stays consistent.

## Why not everything at once?

A system of this scope — 23+ tables, ~15 business modules, POS-style
transaction logic, FIFO costing, multi-branch support, and a full dashboard —
generated in a single pass would necessarily be shallow or contain
placeholder logic, which conflicts with the "fully functional, no
placeholders" requirement. Building it in the phases you specified (schema →
APIs → auth → frontend → each module) keeps every piece real and testable.
Say the word and I'll continue with **Inventory + Purchases** next, then
**Sales + Payments**, and so on.

## Getting Started

### Prerequisites
- Node.js 18+
- MySQL 8+

### 1. Install dependencies
```bash
cd server
npm install
```
> Note: dependencies could not be installed in the sandbox that generated
> this project (no network access there), so `node_modules` is not included.
> Run `npm install` on your own machine — `package.json` lists exact versions.

### 2. Configure environment
```bash
cp .env.example .env
# then edit .env with your MySQL credentials and strong JWT secrets
```
Generate strong secrets, e.g.:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Create the database
```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

### 4. Create your Admin login
```bash
npm run create-admin
```
This prompts for a name/email/password on the terminal and bcrypt-hashes it
before inserting — no password is ever hardcoded in the SQL files.

### 5. Run the server
```bash
npm run dev    # with nodemon, auto-restarts on file changes
# or
npm start
```
The API will be available at `http://localhost:5000/api`. Check
`http://localhost:5000/api/health` to confirm it's running and connected to MySQL.

## API Overview (implemented so far)

| Method | Endpoint                          | Description                          | Permission required |
|--------|------------------------------------|---------------------------------------|----------------------|
| POST   | /api/auth/login                    | Log in, returns access token + sets refresh cookie | — |
| POST   | /api/auth/refresh                  | Get a new access token from refresh cookie | — |
| POST   | /api/auth/logout                   | Log out, clears refresh cookie        | authenticated |
| GET    | /api/auth/me                       | Current user profile + permissions    | authenticated |
| POST   | /api/auth/forgot-password          | Request a password reset token        | — |
| POST   | /api/auth/reset-password           | Reset password using token            | — |
| POST   | /api/auth/change-password          | Change your own password              | authenticated |
| GET/POST/PUT/PATCH | /api/users/*            | Manage employees & roles              | users.manage |
| GET/POST/PUT/DELETE | /api/categories/*      | Manage product categories             | products.* |
| GET/POST/PUT/DELETE | /api/brands/*          | Manage product brands                 | products.* |
| GET/POST/PUT/DELETE | /api/products/*        | Full product master data, image upload, barcode/QR | products.* |
| GET    | /api/products/alerts/summary       | Low stock / out of stock / expired / near-expiry counts | products.view |

All endpoints (except login/refresh/forgot/reset) require:
`Authorization: Bearer <accessToken>`

## Architecture Notes

- **MVC**: `routes/` → `controllers/` → `config/db.js` (raw parameterized SQL via `mysql2/promise`, no ORM — keeps generated SQL fully transparent and easy to optimize/index).
- **Transactions**: multi-step writes (e.g. product creation with code generation) use `withTransaction()` so partial failures roll back cleanly.
- **Audit Logs**: every mutating action calls `recordAudit()`, writing user, IP, action, module, and a human-readable description to `audit_logs`.
- **Security**: helmet, CORS locked to `CLIENT_URL`, rate limiting (general + stricter on auth), parameterized queries (SQL-injection safe), bcrypt (12 rounds), JWT access+refresh split, httpOnly refresh cookie, input validation via `express-validator`, role+permission middleware (`authenticate` + `authorize`).
- **Permissions model**: `roles` → `role_permissions` → `permissions`, checked per-request from the database (not just baked into the JWT), so revoking a permission takes effect on the user's very next request.

## Project Structure
```
store-erp/
├── server/
│   ├── config/db.js            # MySQL pool + query/transaction helpers
│   ├── database/
│   │   ├── schema.sql          # Full normalized schema (23 tables)
│   │   ├── seed.sql            # Roles, permissions, default branch/settings
│   │   └── createAdmin.js      # Safe interactive admin-user creation
│   ├── middleware/
│   │   ├── auth.js             # JWT verify + permission/role guards
│   │   ├── auditLogger.js
│   │   ├── errorHandler.js
│   │   ├── rateLimiter.js
│   │   ├── upload.js           # Multer config (images/receipts)
│   │   └── validate.js
│   ├── controllers/
│   ├── routes/
│   ├── uploads/                # product images, receipts, user photos
│   ├── app.js
│   ├── server.js
│   └── package.json
└── client/                     # Frontend (HTML/CSS/JS) - added in Phase 11
```
