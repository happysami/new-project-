# StoreFlow ERP

A responsive, Firebase-ready inventory, sales, customer, supplier, payments and reporting system built with vanilla HTML, CSS and JavaScript.

## Features
- Dashboard with KPI cards and charts
- Product management and inventory tracking
- Stock entry and inventory history
- Sales creation and payment handling
- Customer, supplier, salesman and expense management
- Reporting and Excel export
- **Data backup and restore functionality**
- **Offline/online status indicator**
- **Confirmation dialogs for destructive actions**
- **Secure ID generation using crypto API**
- **XSS protection for user input**

## Run locally
1. Open index.html in a browser.
2. Sign in with the demo admin user: admin@storeflow.com / admin123.

## Security Features
- SHA-256 password hashing
- Cryptographically secure ID generation
- XSS protection via input sanitization
- Confirmation dialogs for delete operations

## Data Management
- **Backup**: Click "Backup Data" in the Reports section to download all data as JSON
- **Restore**: Click "Restore Backup" to restore from a previously downloaded backup file

## Firebase setup
- Replace the placeholder values in firebase-config.js with your real project config.
- The app will use local storage by default and sync to Firestore when available.

## Keyboard Shortcuts
- `Ctrl/Cmd + K`: Focus global search
- `/`: Focus global search (when not typing)
- `Ctrl/Cmd + N`: Open new sale form
