const STORAGE_KEY = 'storeflow_state_v1';
let state = null;
let currentUser = null;
let activeSection = 'dashboard';
let charts = {};
let firebaseApp = null;
let firebaseDb = null;
let firebaseAuth = null;

const rolePermissions = {
  admin: ['dashboard', 'products', 'stock', 'inventory', 'sales', 'payments', 'calculation', 'suppliers', 'salesmen', 'reports', 'activity'],
  'store manager': ['dashboard', 'products', 'stock', 'inventory', 'sales', 'payments', 'calculation', 'suppliers', 'salesmen', 'reports', 'activity'],
  'sales manager': ['dashboard', 'products', 'inventory', 'sales', 'payments', 'calculation', 'salesmen', 'reports', 'activity'],
  salesman: ['dashboard', 'sales', 'inventory', 'calculation', 'reports'],
  cashier: ['dashboard', 'sales', 'payments', 'inventory', 'calculation', 'reports'],
  accountant: ['dashboard', 'payments', 'calculation', 'reports', 'activity'],
  viewer: ['dashboard', 'inventory', 'calculation', 'reports', 'activity']
};

// Secure ID generation using crypto API
function uid(prefix = 'id') {
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  return `${prefix}${Array.from(array, b => b.toString(36).padStart(2, '0')).join('').toUpperCase()}`;
}

// SHA-256 hash function for password security
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'storeflow_salt_v1');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer), b => b.toString(16).padStart(2, '0')).join('');
}

// Sanitize user input to prevent XSS
function sanitizeHTML(str) {
  const temp = document.createElement('div');
  temp.textContent = str;
  return temp.innerHTML;
}

// Confirmation dialog for destructive actions
function confirmAction(message, callback) {
  const confirmed = window.confirm(message);
  if (confirmed) callback();
}

function currency(value) {
  return `${state?.settings?.currencySymbol || 'ETB'} ${Number(value || 0).toLocaleString()}`;
}

function showLoader(show = true) {
  document.getElementById('loader').classList.toggle('hidden', !show);
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<strong>${sanitizeHTML(type.toUpperCase())}</strong><div>${sanitizeHTML(message)}</div>`;
  document.getElementById('toastContainer').appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

// Offline/online status indicator
function updateOnlineStatus() {
  const indicator = document.getElementById('onlineStatus');
  if (indicator) {
    indicator.className = navigator.onLine ? 'online' : 'offline';
    indicator.textContent = navigator.onLine ? '🟢 Online' : '🔴 Offline';
  }
}
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state = JSON.parse(raw);
      return state;
    }
  } catch (error) {
    console.warn('Failed to load state', error);
  }
  state = seedState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  return state;
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (firebaseDb && typeof firebaseDb.collection === 'function') {
    try {
      firebaseDb.collection('settings').doc('main').set({
        lastSync: new Date().toISOString(),
        snapshot: state
      }, { merge: true });
    } catch (error) {
      console.warn('Firebase sync skipped', error);
    }
  }
}

function seedState() {
  const now = new Date().toISOString();
  return {
    settings: { currencySymbol: 'ETB', cashBalance: 180000, bankBalance: 420000, taxRate: 0.15 },
    users: [
      { id: 'U1', name: 'Admin User', email: 'admin@storeflow.com', password: 'admin123', role: 'admin', photo: '' },
      { id: 'U2', name: 'Store Manager', email: 'store@storeflow.com', password: 'store123', role: 'store manager', photo: '' },
      { id: 'U3', name: 'Sales Manager', email: 'sales@storeflow.com', password: 'sales123', role: 'sales manager', photo: '' },
      { id: 'U4', name: 'Salesman', email: 'salesman@storeflow.com', password: 'salesman123', role: 'salesman', photo: '' },
      { id: 'U5', name: 'Cashier', email: 'cashier@storeflow.com', password: 'cashier123', role: 'cashier', photo: '' },
      { id: 'U6', name: 'Accountant', email: 'accountant@storeflow.com', password: 'accountant123', role: 'accountant', photo: '' },
      { id: 'U7', name: 'Viewer', email: 'viewer@storeflow.com', password: 'viewer123', role: 'viewer', photo: '' }
    ],
    categories: [{ id: 'C1', name: 'Food' }, { id: 'C2', name: 'Electronics' }, { id: 'C3', name: 'Medicine' }],
    products: [
      { id: 'P001', barcode: '100001', qr: 'P001', name: 'Milk Pack', category: 'Food', brand: 'FreshCo', supplier: 'S1', unit: 'Pack', purchasePrice: 95, sellingPrice: 120, wholesalePrice: 110, retailPrice: 125, minSellingPrice: 90, tax: 15, discount: 0, purchaseDate: '2026-06-01', expirationDate: '2026-08-30', location: 'A1', description: 'Fresh dairy', minStock: 20, maxStock: 120, currentQuantity: 45, reservedQuantity: 3, status: 'In Stock', remarks: 'Fast moving', imageUrl: '' },
      { id: 'P002', barcode: '100002', qr: 'P002', name: 'Headphones', category: 'Electronics', brand: 'AudioX', supplier: 'S2', unit: 'Unit', purchasePrice: 800, sellingPrice: 1200, wholesalePrice: 1100, retailPrice: 1250, minSellingPrice: 760, tax: 15, discount: 5, purchaseDate: '2026-05-15', expirationDate: '', location: 'B2', description: 'Wireless headphones', minStock: 10, maxStock: 60, currentQuantity: 8, reservedQuantity: 2, status: 'Low Stock', remarks: 'Restock soon', imageUrl: '' },
      { id: 'P003', barcode: '100003', qr: 'P003', name: 'Paracetamol', category: 'Medicine', brand: 'PharmaCare', supplier: 'S3', unit: 'Box', purchasePrice: 180, sellingPrice: 250, wholesalePrice: 220, retailPrice: 260, minSellingPrice: 170, tax: 0, discount: 0, purchaseDate: '2026-06-10', expirationDate: '2026-10-01', location: 'C3', description: 'Pain reliever', minStock: 15, maxStock: 80, currentQuantity: 0, reservedQuantity: 0, status: 'Out of Stock', remarks: 'Urgent reorder', imageUrl: '' }
    ],
    suppliers: [
      { id: 'S1', name: 'Fresh Supply', phone: '0911000001', address: 'Addis Ababa', email: 'fresh@supply.com', outstandingBalance: 12000, products: ['Milk Pack'] },
     
    ],
    salesmen: [
     { id: 'SM1', name: 'yonata fike', phone: '0922222222', address: 'gofa', email: 'yoni@gmail.com', salary: 12000, commissionRate: 5, todaysSales: 2500, monthlySales: 14500, yearlySales: 52000, pendingCollections: 700, collectedAmount: 12000, performanceRating: 4.6 },
      { id: 'SM2', name: 'momo wolde ', phone: '0933333333',email: 'mamo@example.com', salary: 14000, commissionRate: 2, todaysSales: 3400, monthlySales: 6000, yearlySales: 61000, pendingCollections: 1200, collectedAmount: 15000, performanceRating: 4.8 }
    ],
    inventory: [{ productId: 'P001', quantity: 45, soldQuantity: 15, remainingQuantity: 30, stockValue: 4275, estimatedProfit: 750 }, { productId: 'P002', quantity: 8, soldQuantity: 12, remainingQuantity: 8, stockValue: 6400, estimatedProfit: 1000 }, { productId: 'P003', quantity: 0, soldQuantity: 20, remainingQuantity: 0, stockValue: 0, estimatedProfit: 0 }],
    inventoryHistory: [{ date: '2026-07-01', time: '08:20', user: 'admin', product: 'Milk Pack', action: 'Purchase', quantity: 60, previousBalance: 0, newBalance: 60, remarks: 'Initial stock' }],
    sales: [
      { id: 'INV001', invoiceNumber: 'INV001', customerId: 'CUST1', salesmanId: 'SM1', status: 'Completed', createdAt: now, paymentMethod: 'Cash', subtotal: 1200, tax: 180, discount: 0, grandTotal: 1380, profit: 240, remarks: 'Retail sale', paidAmount: 1380 },
      { id: 'INV002', invoiceNumber: 'INV002', customerId: 'CUST2', salesmanId: 'SM2', status: 'Pending', createdAt: now, paymentMethod: 'CBE', subtotal: 1200, tax: 180, discount: 50, grandTotal: 1330, profit: 180, remarks: 'Credit sale', paidAmount: 500 }
    ],
    saleItems: [{ saleId: 'INV001', productId: 'P001', quantity: 10, unitPrice: 120, lineTotal: 1200 }, { saleId: 'INV002', productId: 'P002', quantity: 1, unitPrice: 1200, lineTotal: 1200 }],
    payments: [{ id: 'PAY1', invoiceNumber: 'INV001', amount: 1380, method: 'Cash', date: '2026-07-01', remarks: 'Sale settled' }, { id: 'PAY2', invoiceNumber: 'INV002', amount: 500, method: 'CBE', date: '2026-07-03', remarks: 'Part payment' }],
    pendingPayments: [{ id: 'PP1', pid: 'PID001', invoiceNumber: 'INV002', customer: 'Selam Tadesse', phone: '0911222222', salesman: 'Marta Daniel', pendingAmount: 830, paidAmount: 500, remainingBalance: 830, expectedDate: '2026-07-10', reminderDate: '2026-07-07', status: 'Waiting', remarks: 'Credit payment' }],
    notifications: [{ id: 'N1', type: 'warning', message: 'Paracetamol is out of stock', createdAt: now }, { id: 'N2', type: 'info', message: 'Pending collection for INV002', createdAt: now }],
    activityLogs: [{ id: 'A1', user: 'admin', date: '2026-07-01', time: '08:20', action: 'Login', details: 'Signed in successfully' }],
    reports: []
  };
}

function initializeFirebase() {
  const config = window.FIREBASE_CONFIG || null;
  if (!config || !window.firebase) return;
  try {
    firebaseApp = firebase.apps.length ? firebase.apps[0] : firebase.initializeApp(config);
    firebaseAuth = firebase.auth();
    firebaseDb = firebase.firestore();
    showToast('Firebase integration ready when configured', 'info');
  } catch (error) {
    console.warn('Firebase unavailable', error);
  }
}

function init() {
  showLoader(true);
  loadState();
  initializeFirebase();
  bindEvents();
  setTheme(localStorage.getItem('storeflow_theme') || 'light');
  updateOnlineStatus();
  showAuthCard();
  setTimeout(() => {
    showLoader(false);
    renderAll();
  }, 400);
}

function bindEvents() {
  document.querySelectorAll('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => openSection(btn.dataset.section));
  });
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('notificationsBtn').addEventListener('click', () => showToast('Notifications panel is live', 'info'));
  document.getElementById('refreshDataBtn').addEventListener('click', () => { renderAll(); showToast('Dashboard refreshed', 'success'); });
  document.getElementById('quickSaleBtn').addEventListener('click', () => { openSection('sales'); showToast('Sales form is ready', 'info'); });
  document.getElementById('globalSearch').addEventListener('input', handleGlobalSearch);
  document.getElementById('closeModalBtn').addEventListener('click', closeModal);
  document.getElementById('authForm').addEventListener('submit', handleAuth);
  document.getElementById('addProductBtn').addEventListener('click', () => openProductModal());
  document.getElementById('addSupplierBtn').addEventListener('click', () => openSupplierModal());
  document.getElementById('addSalesmanBtn').addEventListener('click', () => openSalesmanModal());
  document.getElementById('newSaleBtn').addEventListener('click', () => openSaleModal());
  document.getElementById('exportProductsBtn').addEventListener('click', () => exportTable(state.products, ['ID', 'Name', 'Category', 'Selling Price', 'Quantity']));
  document.getElementById('exportInventoryBtn').addEventListener('click', () => exportInventory());
  document.getElementById('exportAllBtn').addEventListener('click', () => exportAllReports());
  document.getElementById('backupBtn').addEventListener('click', backupData);
  document.getElementById('printInventoryBtn').addEventListener('click', () => window.print());
  document.getElementById('inventorySearch').addEventListener('input', renderInventory);
  document.getElementById('inventoryFilter').addEventListener('change', renderInventory);
  document.getElementById('productSearch').addEventListener('input', renderProducts);
  
  // Calculation module event listeners
  document.getElementById('exportCalculationExcelBtn').addEventListener('click', exportCalculationExcel);
  document.getElementById('exportCalculationCSVBtn').addEventListener('click', exportCalculationCSV);
  document.getElementById('printCalculationBtn').addEventListener('click', printCalculation);
  document.getElementById('calcSearchInput').addEventListener('input', renderCalculation);
  document.getElementById('calcMethodFilter').addEventListener('change', renderCalculation);
  document.getElementById('calcStatusFilter').addEventListener('change', renderCalculation);
  document.getElementById('calcSortBy').addEventListener('change', renderCalculation);
  
  document.addEventListener('keydown', handleKeyboardShortcuts);
  document.getElementById('modal').addEventListener('click', (event) => { if (event.target.id === 'modal') closeModal(); });
}

function setTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  localStorage.setItem('storeflow_theme', theme);
  document.getElementById('themeToggle').textContent = theme === 'dark' ? '🌙' : '☀️';
}

function toggleTheme() {
  const next = document.body.classList.contains('dark') ? 'light' : 'dark';
  setTheme(next);
}

function showAuthCard() {
  document.getElementById('authCard').classList.remove('hidden');
}

function hideAuthCard() {
  document.getElementById('authCard').classList.add('hidden');
}

function handleAuth(event) {
  event.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const found = state.users.find((user) => user.email === email && user.password === password);
  if (!found) {
    showToast('Invalid credentials. Try admin@storeflow.com / admin123', 'danger');
    return;
  }
  currentUser = found;
  document.getElementById('userBadge').textContent = found.name;
  hideAuthCard();
  logActivity('Login', `${found.name} signed in`);
  renderAll();
  showToast(`Welcome ${found.name}`, 'success');
}

function canAccess(section) {
  if (!currentUser) return false;
  return rolePermissions[currentUser.role] ? rolePermissions[currentUser.role].includes(section) : false;
}

function openSection(section) {
  if (!canAccess(section)) {
    showToast('You do not have access to this module', 'warning');
    return;
  }
  activeSection = section;
  document.querySelectorAll('.nav-item').forEach((btn) => btn.classList.toggle('active', btn.dataset.section === section));
  document.querySelectorAll('.content-section').forEach((panel) => panel.classList.toggle('active', panel.id === section));
  renderAll();
}

function renderAll() {
  recalculateState();
  renderDashboard();
  renderProducts();
  renderStockHistory();
  renderInventory();
  renderSales();
  renderPayments();
  renderCalculation();
  renderSuppliers();
  renderSalesmen();
  renderReports();
  renderActivity();
  renderNotifications();
  updateUserBadge();
}

function recalculateState() {
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);
  state.products.forEach((product) => {
    product.availableQuantity = product.currentQuantity - product.reservedQuantity;
    product.status = product.currentQuantity <= 0 ? 'Out of Stock' : product.currentQuantity <= product.minStock ? 'Low Stock' : 'In Stock';
  });
  state.settings.cashBalance = Number(state.settings.cashBalance || 0);
  state.settings.bankBalance = Number(state.settings.bankBalance || 0);
  state.sales.forEach((sale) => {
    if (sale.status === 'Completed' && sale.paidAmount < sale.grandTotal && sale.paymentMethod !== 'Pending') {
      sale.paymentMethod = sale.paymentMethod || 'Pending';
    }
  });
  const todaysSales = state.sales.filter((sale) => sale.createdAt?.slice(0, 10) === today && sale.status === 'Completed').reduce((sum, sale) => sum + Number(sale.grandTotal || 0), 0);
  const todaysProfit = state.sales.filter((sale) => sale.createdAt?.slice(0, 10) === today && sale.status === 'Completed').reduce((sum, sale) => sum + Number(sale.profit || 0), 0);
  const todaysPurchases = state.inventoryHistory.filter((entry) => entry.date === today && entry.action === 'Purchase').reduce((sum, entry) => sum + Number(entry.quantity || 0), 0);
  const monthlySales = state.sales.filter((sale) => sale.createdAt?.slice(0, 7) === month && sale.status === 'Completed').reduce((sum, sale) => sum + Number(sale.grandTotal || 0), 0);
  const monthlyProfit = state.sales.filter((sale) => sale.createdAt?.slice(0, 7) === month && sale.status === 'Completed').reduce((sum, sale) => sum + Number(sale.profit || 0), 0);
  const inventoryValue = state.products.reduce((sum, product) => sum + Number(product.currentQuantity || 0) * Number(product.purchasePrice || 0), 0);
  const pendingCollections = state.pendingPayments.reduce((sum, payment) => sum + Number(payment.remainingBalance || 0), 0);
  const pendingSupplierPayments = state.suppliers.reduce((sum, supplier) => sum + Number(supplier.outstandingBalance || 0), 0);
  const lowStock = state.products.filter((product) => product.currentQuantity > 0 && product.currentQuantity <= product.minStock).length;
  const outOfStock = state.products.filter((product) => product.currentQuantity <= 0).length;
  const expired = state.products.filter((product) => product.expirationDate && product.expirationDate < today).length;
  const nearExpiry = state.products.filter((product) => {
    if (!product.expirationDate) return false;
    const diff = Math.round((new Date(product.expirationDate) - new Date(today)) / 86400000);
    return diff > 0 && diff <= 20;
  }).length;
  state.dashboard = {
    todaysSales,
    todaysProfit,
    todaysPurchases,
    monthlySales,
    monthlyProfit,
    inventoryValue,
    cashBalance: state.settings.cashBalance,
    bankBalance: state.settings.bankBalance,
    pendingCollections,
    pendingSupplierPayments,
    lowStock,
    outOfStock,
    expired,
    nearExpiry
  };
  saveState();
}

function updateUserBadge() {
  const badge = document.getElementById('userBadge');
  if (currentUser) badge.textContent = currentUser.name;
  else badge.textContent = 'Guest';
}

function renderDashboard() {
  const metrics = state.dashboard;
  document.getElementById('dashboardMetrics').innerHTML = [
    { label: 'Today Sales', value: currency(metrics.todaysSales) },
    { label: 'Today Profit', value: currency(metrics.todaysProfit) },
    { label: 'Today Purchases', value: metrics.todaysPurchases },
    { label: 'Monthly Sales', value: currency(metrics.monthlySales) },
    { label: 'Monthly Profit', value: currency(metrics.monthlyProfit) },
    { label: 'Inventory Value', value: currency(metrics.inventoryValue) },
    { label: 'Cash Balance', value: currency(metrics.cashBalance) },
    { label: 'Bank Balance', value: currency(metrics.bankBalance) },
    { label: 'Pending Collections', value: currency(metrics.pendingCollections) },
    { label: 'Pending Supplier Payments', value: currency(metrics.pendingSupplierPayments) },
    { label: 'Low / Out / Expired', value: `${metrics.lowStock}/${metrics.outOfStock}/${metrics.expired}` }
  ].map((card) => `<div class="card"><div class="label">${card.label}</div><div class="value">${card.value}</div><div class="trend">Updated automatically</div></div>`).join('');

  renderChart('revenueChart', buildSalesSeries(), 'Revenue Trend', 'line');
  renderChart('profitChart', buildProfitSeries(), 'Profit Trend', 'bar');
  renderChart('inventoryChart', buildInventorySeries(), 'Inventory Overview', 'doughnut');
  renderChart('paymentChart', buildPaymentSeries(), 'Payment Methods', 'pie');
  renderChart('categoryChart', buildCategorySeries(), 'Sales by Category', 'bar');

  const alerts = state.products.filter((product) => product.currentQuantity <= product.minStock).slice(0, 6);
  document.getElementById('stockAlerts').innerHTML = alerts.length ? alerts.map((product) => `<div class="small">${product.name} — ${product.currentQuantity}/${product.minStock}</div>`).join('') : '<div class="small">All stock levels are healthy.</div>';

  const topProducts = [...state.products].sort((a, b) => (b.currentQuantity - a.currentQuantity)).slice(0, 5);
  document.getElementById('topProducts').innerHTML = topProducts.map((product) => `<div class="small">${product.name} · ${product.currentQuantity} in stock</div>`).join('');

  document.getElementById('notificationList').innerHTML = state.notifications.slice(0, 5).map((notify) => `<div class="small">${notify.message}</div>`).join('');

  const people = [...state.salesmen].sort((a, b) => b.monthlySales - a.monthlySales).slice(0, 3);
  document.getElementById('peopleSummary').innerHTML = people.map((person) => `<div class="small">${person.name} · ${currency(person.monthlySales || 0)}</div>`).join('');
  document.getElementById('notifCount').textContent = state.notifications.length;
}

function renderChart(canvasId, data, label, type) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  if (charts[canvasId]) charts[canvasId].destroy();
  const ctx = canvas.getContext('2d');
  charts[canvasId] = new Chart(ctx, {
    type,
    data: {
      labels: data.labels,
      datasets: data.datasets
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: data.datasets.length > 1 } } }
  });
}

function buildSalesSeries() {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = labels.map(() => Math.floor(Math.random() * 16000 + 8000));
  return { labels, datasets: [{ label: 'Revenue', data: values, borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.2)', fill: true }] };
}

function buildProfitSeries() {
  const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const values = labels.map(() => Math.floor(Math.random() * 10000 + 3000));
  return { labels, datasets: [{ label: 'Profit', data: values, backgroundColor: '#16a34a' }] };
}

function buildInventorySeries() {
  const inStock = state.products.filter((product) => product.currentQuantity > product.minStock).length;
  const low = state.products.filter((product) => product.currentQuantity > 0 && product.currentQuantity <= product.minStock).length;
  const out = state.products.filter((product) => product.currentQuantity <= 0).length;
  return { labels: ['In Stock', 'Low Stock', 'Out of Stock'], datasets: [{ label: 'Inventory', data: [inStock, low, out], backgroundColor: ['#2563eb', '#f59e0b', '#dc2626'] }] };
}

function buildPaymentSeries() {
  const paymentCounts = { Cash: 5, CBE: 3, Telebirr: 2, Other: 1 };
  return { labels: Object.keys(paymentCounts), datasets: [{ label: 'Payments', data: Object.values(paymentCounts), backgroundColor: ['#2563eb', '#16a34a', '#9333ea', '#f59e0b'] }] };
}

function buildCategorySeries() {
  const categories = state.categories.map((category) => category.name);
  const sales = categories.map(() => Math.floor(Math.random() * 20 + 4));
  return { labels: categories, datasets: [{ label: 'Orders', data: sales, backgroundColor: '#60a5fa' }] };
}

function renderProducts() {
  const query = document.getElementById('productSearch').value.toLowerCase();
  const rows = state.products.filter((product) => `${product.id} ${product.name} ${product.category}`.toLowerCase().includes(query));
  document.getElementById('productsTableBody').innerHTML = rows.map((product) => `
    <tr>
      <td>${product.id}</td>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${currency(product.purchasePrice)}</td>
      <td>${currency(product.sellingPrice)}</td>
      <td>${product.availableQuantity}</td>
      <td><span class="badge ${product.status === 'Out of Stock' ? 'danger' : product.status === 'Low Stock' ? 'warning' : 'success'}">${product.status}</span></td>
      <td>
        <button class="action-btn" onclick="editProduct('${product.id}')">Edit</button>
        <button class="action-btn" onclick="deleteProduct('${product.id}')">Delete</button>
        <button class="action-btn" onclick="duplicateProduct('${product.id}')">Dup</button>
      </td>
    </tr>`).join('');
}

function renderStockHistory() {
  document.getElementById('stockHistoryBody').innerHTML = state.inventoryHistory.slice().reverse().map((entry) => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.product}</td>
      <td>${entry.action}</td>
      <td>${entry.quantity}</td>
      <td>${entry.newBalance}</td>
      <td>${entry.remarks}</td>
    </tr>`).join('');
}

function renderInventory() {
  const search = document.getElementById('inventorySearch').value.toLowerCase();
  const filter = document.getElementById('inventoryFilter').value;
  const rows = state.products.filter((product) => {
    const matchesSearch = `${product.name} ${product.category}`.toLowerCase().includes(search);
    const matchesFilter = filter === 'all' || (filter === 'low' && product.currentQuantity <= product.minStock && product.currentQuantity > 0) || (filter === 'out' && product.currentQuantity <= 0);
    return matchesSearch && matchesFilter;
  });
  document.getElementById('inventoryTableBody').innerHTML = rows.map((product) => `
    <tr>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${currency(product.purchasePrice)}</td>
      <td>${currency(product.sellingPrice)}</td>
      <td>${product.currentQuantity}</td>
      <td>${product.availableQuantity}</td>
      <td>${currency(product.currentQuantity * product.purchasePrice)}</td>
      <td><span class="badge ${product.currentQuantity <= 0 ? 'danger' : product.currentQuantity <= product.minStock ? 'warning' : 'success'}">${product.status}</span></td>
    </tr>`).join('');
}

function renderSales() {
  document.getElementById('salesTableBody').innerHTML = state.sales.map((sale) => `
    <tr>
      <td>${sale.invoiceNumber}</td>
      <td>${state.salesmen.find((salesman) => salesman.id === sale.salesmanId)?.name || 'N/A'}</td>
      <td>${sale.status}</td>
      <td>${currency(sale.grandTotal)}</td>
      <td>${currency(sale.profit)}</td>
      <td><button class="action-btn" onclick="markSaleCompleted('${sale.id}')">Complete</button></td>
    </tr>`).join('');
}

function renderPayments() {
  document.getElementById('paymentSummaryCards').innerHTML = [
    ['Cash Total', state.payments.filter((payment) => payment.method === 'Cash').reduce((sum, payment) => sum + payment.amount, 0)],
    ['CBE Total', state.payments.filter((payment) => payment.method === 'CBE').reduce((sum, payment) => sum + payment.amount, 0)],
    ['Telebirr Total', state.payments.filter((payment) => payment.method === 'Telebirr').reduce((sum, payment) => sum + payment.amount, 0)],
    ['Pending Total', state.pendingPayments.reduce((sum, payment) => sum + payment.remainingBalance, 0)]
  ].map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${currency(value)}</div></div>`).join('');

  document.getElementById('pendingPaymentsBody').innerHTML = state.pendingPayments.map((payment) => `
    <tr>
      <td>${payment.invoiceNumber}</td>
      <td>${currency(payment.pendingAmount)}</td>
      <td>${payment.expectedDate}</td>
      <td>${payment.status}</td>
      <td><button class="action-btn" onclick="recordPayment('${payment.invoiceNumber}')">Pay</button></td>
    </tr>`).join('');

  document.getElementById('paymentsTableBody').innerHTML = state.payments.map((payment) => `
    <tr>
      <td>${payment.date}</td>
      <td>${payment.invoiceNumber}</td>
      <td>${payment.method}</td>
      <td>${currency(payment.amount)}</td>
      <td>${payment.remarks}</td>
    </tr>`).join('');
}

function renderSuppliers() {
  document.getElementById('suppliersTableBody').innerHTML = state.suppliers.map((supplier) => `
    <tr>
      <td>${supplier.id}</td>
      <td>${supplier.name}</td>
      <td>${supplier.phone}</td>
      <td>${currency(supplier.outstandingBalance)}</td>
      <td><button class="action-btn" onclick="editSupplier('${supplier.id}')">Edit</button></td>
    </tr>`).join('');
}

function renderSalesmen() {
  document.getElementById('salesmenTableBody').innerHTML = state.salesmen.map((salesman) => `
    <tr>
      <td>${salesman.id}</td>
      <td>${salesman.name}</td>
      <td>${salesman.phone}</td>
      <td>${currency(salesman.monthlySales)}</td>
      <td>${salesman.commissionRate}%</td>
      <td><button class="action-btn" onclick="editSalesman('${salesman.id}')">Edit</button></td>
    </tr>`).join('');
}

function renderReports() {
  const summary = [
    ['Sales', currency(state.dashboard.todaysSales)],
    ['Profit', currency(state.dashboard.todaysProfit)],
    ['Inventory Value', currency(state.dashboard.inventoryValue)]
  ];
  document.getElementById('reportsPanel').innerHTML = `<div class="cards-grid">${summary.map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`).join('')}</div><div class="small" style="margin-top:12px;">Export options are available from the toolbar and report data is updated automatically.</div>`;
}

function renderActivity() {
  document.getElementById('activityTableBody').innerHTML = state.activityLogs.slice().reverse().map((entry) => `
    <tr>
      <td>${entry.date}</td>
      <td>${entry.user}</td>
      <td>${entry.action}</td>
      <td>${entry.details}</td>
    </tr>`).join('');
}

// Date filter functions for Calculation module
function setDateFilter(filterType) {
  window.calcDateFilterType = filterType;
  
  // Update button states
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filterType);
  });
  
  // Show/hide custom date range inputs
  const customRange = document.getElementById('customDateRange');
  if (customRange) {
    customRange.classList.toggle('hidden', filterType !== 'custom');
  }
  
  // Update report period display
  updateReportPeriodDisplay(filterType);
  
  // Re-render calculation
  renderCalculation();
}

function setCustomDateRange() {
  const dateFrom = document.getElementById('calcCustomDateFrom')?.value || '';
  const dateTo = document.getElementById('calcCustomDateTo')?.value || '';
  
  if (dateFrom && dateTo) {
    updateReportPeriodDisplay('custom', dateFrom, dateTo);
    renderCalculation();
  }
}

function updateReportPeriodDisplay(filterType, dateFrom = '', dateTo = '') {
  const display = document.getElementById('reportPeriodDisplay');
  if (!display) return;
  
  const today = new Date();
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  let periodText = 'All Time';
  
  switch (filterType) {
    case 'today':
      periodText = 'Today';
      break;
    case 'yesterday':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      periodText = formatDateForDisplay(getLocalDateString(yesterday));
      break;
    case 'thisWeek':
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      periodText = `Week: ${formatDateForDisplay(getLocalDateString(weekStart))} - Today`;
      break;
    case 'thisMonth':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      periodText = `Month: ${formatDateForDisplay(getLocalDateString(monthStart))} - Today`;
      break;
    case 'thisYear':
      periodText = `Year: ${today.getFullYear()}`;
      break;
    case 'custom':
      if (dateFrom && dateTo) {
        periodText = `${formatDateForDisplay(dateFrom)} - ${formatDateForDisplay(dateTo)}`;
      } else if (dateFrom) {
        periodText = `From: ${formatDateForDisplay(dateFrom)}`;
      } else if (dateTo) {
        periodText = `Until: ${formatDateForDisplay(dateTo)}`;
      } else {
        periodText = 'Custom Range';
      }
      break;
    default:
      periodText = 'All Time';
  }
  
  display.textContent = periodText;
}

function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  // Parse the date string directly to avoid timezone issues
  const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (parts) {
    const date = new Date(parseInt(parts[1]), parseInt(parts[2]) - 1, parseInt(parts[3]));
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  }
  // Fallback
  const date = new Date(dateStr);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

function getReportPeriodForExport() {
  const filterType = window.calcDateFilterType || 'allTime';
  const display = document.getElementById('reportPeriodDisplay')?.textContent || 'All Time';
  return display;
}

function renderCalculation() {
  // Get filters
  const searchQuery = (document.getElementById('calcSearchInput')?.value || '').toLowerCase();
  const methodFilter = document.getElementById('calcMethodFilter')?.value || 'all';
  const statusFilter = document.getElementById('calcStatusFilter')?.value || 'all';
  const sortBy = document.getElementById('calcSortBy')?.value || 'date-desc';
  
  // Get date range from quick filter or custom (using local date)
  let dateFrom = '';
  let dateTo = '';
  const dateFilterType = window.calcDateFilterType || 'allTime';
  
  // Helper to get local date string
  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  if (dateFilterType !== 'allTime') {
    const today = new Date();
    
    switch (dateFilterType) {
      case 'today':
        dateFrom = getLocalDateString(today);
        dateTo = getLocalDateString(today);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        dateFrom = getLocalDateString(yesterday);
        dateTo = getLocalDateString(yesterday);
        break;
      case 'thisWeek':
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        dateFrom = getLocalDateString(weekStart);
        dateTo = getLocalDateString(today);
        break;
      case 'thisMonth':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        dateFrom = getLocalDateString(monthStart);
        dateTo = getLocalDateString(today);
        break;
      case 'thisYear':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        dateFrom = getLocalDateString(yearStart);
        dateTo = getLocalDateString(today);
        break;
      case 'custom':
        dateFrom = document.getElementById('calcCustomDateFrom')?.value || '';
        dateTo = document.getElementById('calcCustomDateTo')?.value || '';
        break;
    }
  }
  
  // Build transaction list
  const transactions = [];
  
  // Helper to get date from various formats
  const getDateFromTransaction = (sale) => {
    if (sale.createdAt) {
      // Handle ISO string and local date formats
      const date = new Date(sale.createdAt);
      if (!isNaN(date.getTime())) {
        return getLocalDateString(date);
      }
      // Try as local date string
      if (sale.createdAt.match(/^\d{4}-\d{2}-\d{2}/)) {
        return sale.createdAt.slice(0, 10);
      }
    }
    return sale.createdAt?.slice(0, 10) || '';
  };
  
  // Process completed sales (payments received)
  state.sales.forEach(sale => {
    if (sale.status === 'Completed' || sale.status === 'Pending') {
      const transaction = {
        date: getDateFromTransaction(sale),
        invoiceNumber: sale.invoiceNumber,
        salesman: state.salesmen.find(s => s.id === sale.salesmanId)?.name || 'N/A',
        paymentMethod: sale.paymentMethod || 'Cash',
        transferType: sale.transferType || (sale.paymentMethod === 'Cash' ? 'Cash' : ''),
        amount: sale.paidAmount || 0,
        grandTotal: sale.grandTotal || 0,
        pid: '',
        referenceNumber: sale.referenceNumber || '',
        status: sale.status,
        remark: sale.remarks || '',
        profit: sale.profit || 0,
        type: 'sale'
      };
      transactions.push(transaction);
    }
  });
  
  // Process pending payments (waiting)
  state.pendingPayments.forEach(payment => {
    if (payment.status === 'Waiting' || payment.status === 'Pending') {
      const transaction = {
        date: payment.expectedDate || '',
        invoiceNumber: payment.invoiceNumber,
        salesman: payment.salesman || 'N/A',
        paymentMethod: 'Waiting',
        transferType: 'Waiting',
        amount: payment.remainingBalance || payment.pendingAmount || 0,
        grandTotal: payment.pendingAmount || 0,
        pid: payment.pid || '',
        referenceNumber: '',
        status: payment.status,
        remark: payment.remarks || '',
        profit: 0,
        type: 'pending'
      };
      transactions.push(transaction);
    }
  });
  
  // Process direct payments
  state.payments.forEach(payment => {
    if (payment.status !== 'Cancelled') {
      // Normalize payment date
      let paymentDate = payment.date || '';
      if (paymentDate && paymentDate.match(/^\d{4}-\d{2}-\d{2}/)) {
        paymentDate = paymentDate.slice(0, 10);
      }
      
      let isDuplicate = transactions.some(t => t.type === 'sale' && t.invoiceNumber === payment.invoiceNumber && t.date === paymentDate);
      if (!isDuplicate) {
        const transaction = {
          date: paymentDate,
          invoiceNumber: payment.invoiceNumber,
          salesman: state.sales.find(s => s.invoiceNumber === payment.invoiceNumber)?.salesmanId ? 
            state.salesmen.find(sm => sm.id === state.sales.find(s => s.invoiceNumber === payment.invoiceNumber).salesmanId)?.name || 'N/A' : 'N/A',
          paymentMethod: payment.method || 'Cash',
          transferType: payment.transferType || payment.method || 'Cash',
          amount: payment.amount || 0,
          grandTotal: payment.amount || 0,
          pid: payment.pid || '',
          referenceNumber: payment.referenceNumber || '',
          status: 'Completed',
          remark: payment.remarks || '',
          profit: 0,
          type: 'payment'
        };
        transactions.push(transaction);
      }
    }
  });
  
  // Apply filters
  let filteredTransactions = transactions.filter(t => {
    // Search filter
    if (searchQuery) {
      const searchable = `${t.invoiceNumber} ${t.referenceNumber} ${t.salesman} ${t.remark} ${t.pid}`.toLowerCase();
      if (!searchable.includes(searchQuery)) return false;
    }
    
    // Method filter
    if (methodFilter !== 'all') {
      if (methodFilter === 'Waiting') {
        if (t.paymentMethod !== 'Waiting') return false;
      } else if (t.paymentMethod !== methodFilter) return false;
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      if (t.status !== statusFilter) return false;
    }
    
    // Date filter
    if (dateFrom && t.date && t.date < dateFrom) return false;
    if (dateTo && t.date && t.date > dateTo) return false;
    
    return true;
  });
  
  // Apply sorting
  filteredTransactions.sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        return (a.date || '').localeCompare(b.date || '');
      case 'date-desc':
        return (b.date || '').localeCompare(a.date || '');
      case 'amount-asc':
        return a.amount - b.amount;
      case 'amount-desc':
        return b.amount - a.amount;
      case 'method':
        return (a.paymentMethod || '').localeCompare(b.paymentMethod || '');
      case 'salesman':
        return (a.salesman || '').localeCompare(b.salesman || '');
      case 'invoice-asc':
        return (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
      case 'invoice-desc':
        return (b.invoiceNumber || '').localeCompare(a.invoiceNumber || '');
      default:
        return 0;
    }
  });
  
  // Calculate totals from FILTERED transactions only
  let totalCash = 0;
  let totalCBE = 0;
  let totalTelebirr = 0;
  let totalBOA = 0;
  let totalOther = 0;
  let totalWaiting = 0;
  let totalProfit = 0;
  
  filteredTransactions.forEach(t => {
    if (t.paymentMethod === 'Cash') {
      totalCash += t.amount || 0;
    } else if (t.paymentMethod === 'CBE') {
      totalCBE += t.amount || 0;
    } else if (t.paymentMethod === 'Telebirr') {
      totalTelebirr += t.amount || 0;
    } else if (t.paymentMethod === 'BOA') {
      totalBOA += t.amount || 0;
    } else if (t.paymentMethod === 'Other') {
      totalOther += t.amount || 0;
    } else if (t.paymentMethod === 'Waiting') {
      totalWaiting += t.amount || 0;
    }
    totalProfit += t.profit || 0;
  });
  
  // Update summary cards
  const grandTotalReceived = totalCash + totalCBE + totalTelebirr + totalBOA + totalOther;
  const totalSalesAmount = grandTotalReceived + totalWaiting;
  
  document.getElementById('calcTotalCash').textContent = currency(totalCash);
  document.getElementById('calcTotalCBE').textContent = currency(totalCBE);
  document.getElementById('calcTotalTelebirr').textContent = currency(totalTelebirr);
  document.getElementById('calcTotalBOA').textContent = currency(totalBOA);
  document.getElementById('calcTotalOther').textContent = currency(totalOther);
  document.getElementById('calcTotalWaiting').textContent = currency(totalWaiting);
  document.getElementById('calcGrandTotal').textContent = currency(grandTotalReceived);
  document.getElementById('calcTotalSales').textContent = currency(totalSalesAmount);
  document.getElementById('calcNetProfit').textContent = currency(totalProfit);
  
  // Render table
  const tbody = document.getElementById('calculationTableBody');
  if (!tbody) return;
  
  tbody.innerHTML = filteredTransactions.map(t => `
    <tr>
      <td>${t.date || '-'}</td>
      <td><strong>${t.invoiceNumber || '-'}</strong></td>
      <td>${t.salesman || '-'}</td>
      <td><span class="method-badge ${(t.paymentMethod || '').toLowerCase()}">${t.paymentMethod || '-'}</span></td>
      <td>${t.transferType || '-'}</td>
      <td><strong>${currency(t.amount)}</strong></td>
      <td>${t.pid || '-'}</td>
      <td>${t.referenceNumber || '-'}</td>
      <td><span class="status-badge ${(t.status || '').toLowerCase()}">${t.status || '-'}</span></td>
      <td>${t.remark || '-'}</td>
      <td>
        ${t.type === 'pending' && t.status === 'Waiting' ? `
          <button class="action-btn complete" onclick="openMarkAsPaidModal('${t.invoiceNumber}')">Mark Paid</button>
        ` : ''}
      </td>
    </tr>`).join('');
  
  // Update entries count
  const entriesCount = document.getElementById('calcEntriesCount');
  if (entriesCount) {
    entriesCount.textContent = `Showing ${filteredTransactions.length} of ${transactions.length} entries`;
  }
}

function openMarkAsPaidModal(invoiceNumber) {
  const pending = state.pendingPayments.find(p => p.invoiceNumber === invoiceNumber);
  if (!pending) return showToast('Payment not found', 'error');
  
  const html = `
    <div class="row">
      <div><strong>Invoice:</strong> ${invoiceNumber}</div>
      <div><strong>Amount:</strong> ${currency(pending.remainingBalance || pending.pendingAmount)}</div>
    </div>
    <div class="row">
      <select name="paymentMethod" id="paidPaymentMethod" onchange="toggleTransferFields()">
        <option value="Cash">Cash</option>
        <option value="CBE">CBE Transfer</option>
        <option value="Telebirr">Telebirr</option>
        <option value="BOA">BOA Transfer</option>
        <option value="Other">Other Transfer</option>
      </select>
    </div>
    <div id="transferFields" class="hidden">
      <div class="row">
        <input name="transferName" placeholder="Transfer Name" />
        <input name="referenceNumber" placeholder="Reference Number" />
      </div>
    </div>
    <textarea name="remarks" placeholder="Payment remarks"></textarea>
  `;
  
  openModal('Mark as Paid', html, (formData) => {
    const payload = Object.fromEntries(formData);
    const paymentMethod = payload.paymentMethod || 'Cash';
    const amount = pending.remainingBalance || pending.pendingAmount || 0;
    
    // Update pending payment status
    pending.status = 'Paid';
    pending.paidAmount = (pending.paidAmount || 0) + amount;
    pending.remainingBalance = 0;
    
    // Add payment record
    state.payments.push({
      id: uid('PAY'),
      invoiceNumber,
      amount,
      method: paymentMethod,
      transferType: payload.referenceNumber ? payload.referenceNumber : paymentMethod,
      referenceNumber: payload.referenceNumber || '',
      date: new Date().toISOString().slice(0, 10),
      remarks: payload.remarks || 'Payment received'
    });
    
    // Update sale status if needed
    const sale = state.sales.find(s => s.invoiceNumber === invoiceNumber);
    if (sale) {
      sale.status = 'Completed';
      sale.paidAmount = (sale.paidAmount || 0) + amount;
    }
    
    // Update cash balance if Cash
    if (paymentMethod === 'Cash') {
      state.settings.cashBalance = (state.settings.cashBalance || 0) + amount;
    }
    
    logActivity('Payment Received', `${invoiceNumber} paid via ${paymentMethod}`);
    closeModal();
    renderAll();
    showToast('Payment marked as paid', 'success');
  });
}

function toggleTransferFields() {
  const method = document.getElementById('paidPaymentMethod')?.value;
  const transferFields = document.getElementById('transferFields');
  if (transferFields) {
    transferFields.classList.toggle('hidden', method === 'Cash');
  }
}

function exportCalculationExcel() {
  const reportPeriod = getReportPeriodForExport();
  const totals = {
    'Total Cash': document.getElementById('calcTotalCash')?.textContent || 'ETB 0',
    'Total CBE': document.getElementById('calcTotalCBE')?.textContent || 'ETB 0',
    'Total Telebirr': document.getElementById('calcTotalTelebirr')?.textContent || 'ETB 0',
    'Total BOA': document.getElementById('calcTotalBOA')?.textContent || 'ETB 0',
    'Total Other Transfers': document.getElementById('calcTotalOther')?.textContent || 'ETB 0',
    'Total Waiting Payments': document.getElementById('calcTotalWaiting')?.textContent || 'ETB 0',
    'Grand Total Received': document.getElementById('calcGrandTotal')?.textContent || 'ETB 0',
    'Total Sales': document.getElementById('calcTotalSales')?.textContent || 'ETB 0',
    'Net Profit': document.getElementById('calcNetProfit')?.textContent || 'ETB 0'
  };
  
  // Get table data
  const table = document.querySelector('#calculationTableBody');
  const rows = [];
  if (table) {
    table.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        rows.push({
          'Date': cells[0]?.textContent || '',
          'Invoice': cells[1]?.textContent || '',
          'Salesman': cells[2]?.textContent || '',
          'Payment Method': cells[3]?.textContent || '',
          'Transfer Type': cells[4]?.textContent || '',
          'Amount': cells[5]?.textContent || '',
          'PID': cells[6]?.textContent || '',
          'Reference No.': cells[7]?.textContent || '',
          'Status': cells[8]?.textContent || '',
          'Remark': cells[9]?.textContent || ''
        });
      }
    });
  }
  
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  
  // Add summary section with report period
  XLSX.utils.sheet_add_aoa(ws, [
    ['Calculation Summary Report'],
    [`Report Period: ${reportPeriod}`],
    ['Generated: ' + new Date().toLocaleString()],
    [''],
    ['Summary', 'Amount'],
    ['Total Cash', totals['Total Cash']],
    ['Total CBE', totals['Total CBE']],
    ['Total Telebirr', totals['Total Telebirr']],
    ['Total BOA', totals['Total BOA']],
    ['Total Other Transfers', totals['Total Other Transfers']],
    ['Total Waiting Payments', totals['Total Waiting Payments']],
    ['Grand Total Received', totals['Grand Total Received']],
    ['Total Sales', totals['Total Sales']],
    ['Net Profit', totals['Net Profit']],
    [''],
    ['Transaction Details']
  ], { origin: 'A1' });
  
  XLSX.utils.book_append_sheet(wb, ws, 'Calculation Report');
  XLSX.writeFile(wb, `Calculation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  showToast('Report exported to Excel', 'success');
}

function exportCalculationCSV() {
  const reportPeriod = getReportPeriodForExport();
  const rows = [];
  
  // Add header with report period
  rows.push(['Calculation Summary Report']);
  rows.push([`Report Period: ${reportPeriod}`]);
  rows.push(['Generated: ' + new Date().toLocaleString()]);
  rows.push(['']);
  rows.push(['Summary', 'Amount']);
  rows.push(['Total Cash', document.getElementById('calcTotalCash')?.textContent || 'ETB 0']);
  rows.push(['Total CBE', document.getElementById('calcTotalCBE')?.textContent || 'ETB 0']);
  rows.push(['Total Telebirr', document.getElementById('calcTotalTelebirr')?.textContent || 'ETB 0']);
  rows.push(['Total BOA', document.getElementById('calcTotalBOA')?.textContent || 'ETB 0']);
  rows.push(['Total Other Transfers', document.getElementById('calcTotalOther')?.textContent || 'ETB 0']);
  rows.push(['Total Waiting Payments', document.getElementById('calcTotalWaiting')?.textContent || 'ETB 0']);
  rows.push(['Grand Total Received', document.getElementById('calcGrandTotal')?.textContent || 'ETB 0']);
  rows.push(['Total Sales', document.getElementById('calcTotalSales')?.textContent || 'ETB 0']);
  rows.push(['Net Profit', document.getElementById('calcNetProfit')?.textContent || 'ETB 0']);
  rows.push(['']);
  rows.push(['Date', 'Invoice', 'Salesman', 'Payment Method', 'Transfer Type', 'Amount', 'PID', 'Reference No.', 'Status', 'Remark']);
  
  // Get table data
  const table = document.querySelector('#calculationTableBody');
  if (table) {
    table.querySelectorAll('tr').forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length > 0) {
        rows.push([
          cells[0]?.textContent || '',
          cells[1]?.textContent || '',
          cells[2]?.textContent || '',
          cells[3]?.textContent || '',
          cells[4]?.textContent || '',
          cells[5]?.textContent || '',
          cells[6]?.textContent || '',
          cells[7]?.textContent || '',
          cells[8]?.textContent || '',
          cells[9]?.textContent || ''
        ]);
      }
    });
  }
  
  const csv = rows.map(r => r.map(c => `"${(c || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Calculation_Report_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Report exported to CSV', 'success');
}

function printCalculation() {
  window.print();
  showToast('Printing calculation report', 'info');
}

function renderNotifications() {
  const list = state.notifications.slice().reverse();
  document.getElementById('notifCount').textContent = list.length;
}

function logActivity(action, details) {
  state.activityLogs.push({ id: uid('A'), user: currentUser?.name || 'System', date: new Date().toISOString().slice(0, 10), time: new Date().toTimeString().slice(0, 5), action, details });
  saveState();
}

function addNotification(message, type = 'info') {
  state.notifications.unshift({ id: uid('N'), type, message, createdAt: new Date().toISOString() });
  saveState();
}

function openModal(title, bodyHtml, submitHandler) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `
    <form id="modalForm" class="stacked-form">
      ${bodyHtml}
      <div class="section-actions" style="justify-content:flex-end; margin-top:10px;">
        <button class="secondary-btn" type="button" id="cancelModalBtn">Cancel</button>
        <button class="primary-btn" type="submit">Save</button>
      </div>
    </form>`;
  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('cancelModalBtn').addEventListener('click', closeModal);
  document.getElementById('modalForm').addEventListener('submit', (event) => {
    event.preventDefault();
    submitHandler(new FormData(event.currentTarget));
  });
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function openProductModal(productId = null) {
  const product = state.products.find((entry) => entry.id === productId);
  const html = `
    <div class="row">
      <input name="id" value="${product?.id || uid('P')}" placeholder="Product ID" required />
      <input name="name" value="${product?.name || ''}" placeholder="Product Name" required />
    </div>
    <div class="row">
      <input name="barcode" value="${product?.barcode || ''}" placeholder="Barcode" />
      <input name="category" value="${product?.category || ''}" placeholder="Category" />
    </div>
    <div class="row">
      <input name="supplier" value="${product?.supplier || ''}" placeholder="Supplier" />
      <input name="unit" value="${product?.unit || ''}" placeholder="Unit" />
    </div>
    <div class="row">
      <input type="number" name="purchasePrice" value="${product?.purchasePrice || 0}" placeholder="Purchase Price" />
      <input type="number" name="sellingPrice" value="${product?.sellingPrice || 0}" placeholder="Selling Price" />
    </div>
    <div class="row">
      <input type="number" name="minStock" value="${product?.minStock || 0}" placeholder="Minimum Stock" />
      <input type="number" name="currentQuantity" value="${product?.currentQuantity || 0}" placeholder="Current Quantity" />
    </div>
    <div class="row">
      <input type="date" name="purchaseDate" value="${product?.purchaseDate || new Date().toISOString().slice(0,10)}" />
      <input type="date" name="expirationDate" value="${product?.expirationDate || ''}" />
    </div>
    <textarea name="remarks" placeholder="Remarks">${product?.remarks || ''}</textarea>`;
  openModal(product ? 'Edit Product' : 'Add Product', html, (formData) => {
    const payload = Object.fromEntries(formData.entries());
    payload.currentQuantity = Number(payload.currentQuantity || 0);
    payload.minStock = Number(payload.minStock || 0);
    payload.purchasePrice = Number(payload.purchasePrice || 0);
    payload.sellingPrice = Number(payload.sellingPrice || 0);
    payload.availableQuantity = payload.currentQuantity;
    payload.status = payload.currentQuantity <= 0 ? 'Out of Stock' : payload.currentQuantity <= payload.minStock ? 'Low Stock' : 'In Stock';
    if (product) {
      Object.assign(product, payload);
      logActivity('Product Updated', `${payload.name} updated`);
      showToast('Product updated', 'success');
    } else {
      state.products.push({ ...payload, id: payload.id, barcode: payload.barcode || uid('BAR'), qr: payload.id, supplier: payload.supplier || 'N/A', category: payload.category || 'General', purchaseDate: payload.purchaseDate || new Date().toISOString().slice(0,10), expirationDate: payload.expirationDate || '', location: 'A1', brand: 'Generic', unit: payload.unit || 'Unit', wholesalePrice: payload.sellingPrice, retailPrice: payload.sellingPrice, minSellingPrice: payload.sellingPrice, tax: 0, discount: 0, reservedQuantity: 0, description: '', imageUrl: '' });
      logActivity('Product Added', `${payload.name} added`);
      showToast('Product added', 'success');
    }
    closeModal();
    renderAll();
  });
}

function editProduct(productId) { openProductModal(productId); }
function deleteProduct(productId) {
  const product = state.products.find(p => p.id === productId);
  confirmAction(`Are you sure you want to delete "${product?.name || productId}"?`, () => {
    state.products = state.products.filter((product) => product.id !== productId);
    logActivity('Product Deleted', `Removed ${productId}`);
    renderAll();
    showToast('Product deleted', 'warning');
  });
}
function duplicateProduct(productId) {
  const product = state.products.find((entry) => entry.id === productId);
  if (!product) return;
  const duplicate = { ...product, id: uid('P'), name: `${product.name} Copy`, currentQuantity: 0, availableQuantity: 0, status: 'Out of Stock' };
  state.products.push(duplicate);
  logActivity('Product Added', `${duplicate.name} duplicated`);
  renderAll();
  showToast('Product duplicated', 'success');
}

function openStockModal() {
  const html = `
    <div class="row">
      <select name="productId">${state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join('')}</select>
      <input type="number" name="quantity" placeholder="Quantity" required />
    </div>
    <div class="row">
      <input type="number" name="purchasePrice" placeholder="Purchase Price" required />
      <input type="number" name="sellingPrice" placeholder="Selling Price" required />
    </div>
    <div class="row">
      <input type="date" name="purchaseDate" value="${new Date().toISOString().slice(0,10)}" />
      <input type="text" name="batchNumber" placeholder="Batch Number" />
    </div>
    <textarea name="remarks" placeholder="Remarks"></textarea>`;
  openModal('Add Stock', html, (formData) => {
    const payload = Object.fromEntries(formData.entries());
    const product = state.products.find((entry) => entry.id === payload.productId);
    if (!product) return;
    const quantity = Number(payload.quantity || 0);
    product.currentQuantity += quantity;
    product.purchasePrice = Number(payload.purchasePrice || product.purchasePrice);
    product.sellingPrice = Number(payload.sellingPrice || product.sellingPrice);
    product.availableQuantity = product.currentQuantity - product.reservedQuantity;
    product.status = product.currentQuantity <= 0 ? 'Out of Stock' : product.currentQuantity <= product.minStock ? 'Low Stock' : 'In Stock';
    state.inventoryHistory.push({ date: payload.purchaseDate || new Date().toISOString().slice(0,10), time: new Date().toTimeString().slice(0, 5), user: currentUser?.name || 'system', product: product.name, action: 'Purchase', quantity, previousBalance: product.currentQuantity - quantity, newBalance: product.currentQuantity, remarks: payload.remarks || 'Stock entry' });
    state.settings.cashBalance -= Number(payload.purchasePrice || 0) * quantity;
    logActivity('Inventory Updated', `${product.name} purchased ${quantity}`);
    addNotification(`${product.name} stock updated by ${quantity}`, 'success');
    closeModal();
    renderAll();
  });
}

function openSaleModal(saleId = null) {
  const sale = state.sales.find((entry) => entry.id === saleId);
  const html = `
    <div class="row">
      <select name="salesmanId">${state.salesmen.map((salesman) => `<option value="${salesman.id}" ${sale?.salesmanId === salesman.id ? 'selected' : ''}>${salesman.name}</option>`).join('')}</select>
    </div>
    <div class="row">
      <select name="productId">${state.products.map((product) => `<option value="${product.id}">${product.name}</option>`).join('')}</select>
      <input type="number" name="quantity" value="1" min="1" />
    </div>
    <div class="row">
      <input type="number" name="discount" value="${sale?.discount || 0}" />
      <input type="number" name="tax" value="${sale?.tax || 15}" />
    </div>
    <div class="row">
      <select name="paymentMethod" id="salePaymentMethod" onchange="toggleSaleTransferFields()"><option value="Cash" ${sale?.paymentMethod === 'Cash' ? 'selected' : ''}>Cash</option><option value="CBE" ${sale?.paymentMethod === 'CBE' ? 'selected' : ''}>CBE Transfer</option><option value="Telebirr" ${sale?.paymentMethod === 'Telebirr' ? 'selected' : ''}>Telebirr</option><option value="BOA" ${sale?.paymentMethod === 'BOA' ? 'selected' : ''}>BOA Transfer</option><option value="Other" ${sale?.paymentMethod === 'Other' ? 'selected' : ''}>Other Transfer</option></select>
      <select name="status"><option value="Completed" ${sale?.status === 'Completed' ? 'selected' : ''}>Completed</option><option value="Pending" ${sale?.status === 'Pending' ? 'selected' : ''}>Pending</option><option value="Cancelled" ${sale?.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option></select>
    </div>
    <div id="saleTransferFields" class="${sale?.paymentMethod && sale?.paymentMethod !== 'Cash' ? '' : 'hidden'}">
      <div class="row">
        <input name="transferType" id="saleTransferType" value="${sale?.transferType || ''}" placeholder="Transfer Type (e.g., CBE, Telebirr)" />
        <input name="referenceNumber" id="saleReferenceNumber" value="${sale?.referenceNumber || ''}" placeholder="Reference/Transaction Number" />
      </div>
    </div>
    <textarea name="remarks" placeholder="Remarks">${sale?.remarks || ''}</textarea>`;
  openModal(sale ? 'Edit Sale' : 'Create Sale', html, (formData) => {
    const payload = Object.fromEntries(formData.entries());
    const product = state.products.find((entry) => entry.id === payload.productId);
    if (!product) return;
    const quantity = Number(payload.quantity || 1);
    const subtotal = Number(product.sellingPrice || 0) * quantity;
    const discount = Number(payload.discount || 0);
    const tax = Number(payload.tax || 0);
    const grandTotal = subtotal - discount + (subtotal * tax) / 100;
    const profit = grandTotal - (product.purchasePrice * quantity);
    const invoiceNumber = sale?.invoiceNumber || uid('INV');
    const saleEntry = {
      id: sale?.id || invoiceNumber,
      invoiceNumber,
      salesmanId: payload.salesmanId,
      status: payload.status || 'Completed',
      createdAt: new Date().toISOString(),
      paymentMethod: payload.paymentMethod || 'Cash',
      transferType: payload.transferType || '',
      referenceNumber: payload.referenceNumber || '',
      subtotal,
      tax: (subtotal * tax) / 100,
      discount,
      grandTotal,
      profit,
      remarks: payload.remarks || '',
      paidAmount: payload.status === 'Pending' ? 0 : grandTotal
    };
    if (sale) {
      Object.assign(sale, saleEntry);
      logActivity('Sale Updated', `${invoiceNumber} updated`);
      showToast('Sale updated', 'success');
    } else {
      state.sales.push(saleEntry);
      state.saleItems.push({ saleId: invoiceNumber, productId: payload.productId, quantity, unitPrice: product.sellingPrice, lineTotal: subtotal });
      if (payload.status === 'Completed') {
        product.currentQuantity -= quantity;
        product.availableQuantity = product.currentQuantity - product.reservedQuantity;
        product.status = product.currentQuantity <= 0 ? 'Out of Stock' : product.currentQuantity <= product.minStock ? 'Low Stock' : 'In Stock';
        state.inventoryHistory.push({ date: new Date().toISOString().slice(0,10), time: new Date().toTimeString().slice(0,5), user: currentUser?.name || 'system', product: product.name, action: 'Sale', quantity, previousBalance: product.currentQuantity + quantity, newBalance: product.currentQuantity, remarks: 'Completed sale' });
        state.payments.push({ id: uid('PAY'), invoiceNumber, amount: grandTotal, method: payload.paymentMethod || 'Cash', transferType: payload.transferType || '', referenceNumber: payload.referenceNumber || '', date: new Date().toISOString().slice(0,10), remarks: 'Sale payment' });
      } else if (payload.status === 'Pending') {
        state.pendingPayments.push({ id: uid('PP'), pid: uid('PID'), invoiceNumber, salesman: state.salesmen.find((salesman) => salesman.id === payload.salesmanId)?.name || 'N/A', pendingAmount: grandTotal, paidAmount: 0, remainingBalance: grandTotal, expectedDate: new Date().toISOString().slice(0,10), reminderDate: new Date().toISOString().slice(0,10), status: 'Waiting', remarks: 'Credit sale' });
      }
      logActivity('Sale Created', `${invoiceNumber} created`);
      showToast('Sale created', 'success');
    }
    closeModal();
    renderAll();
  });
}

function toggleSaleTransferFields() {
  const method = document.getElementById('salePaymentMethod')?.value;
  const transferFields = document.getElementById('saleTransferFields');
  if (transferFields) {
    transferFields.classList.toggle('hidden', method === 'Cash');
  }
}

function markSaleCompleted(saleId) {
  const sale = state.sales.find((entry) => entry.id === saleId);
  if (!sale) return;
  if (sale.status === 'Completed') {
    showToast('Sale already completed', 'info');
    return;
  }
  const product = state.products.find((entry) => entry.id === state.saleItems.find((item) => item.saleId === sale.invoiceNumber)?.productId);
  if (product) {
    const item = state.saleItems.find((entry) => entry.saleId === sale.invoiceNumber);
    product.currentQuantity -= item.quantity;
    product.availableQuantity = product.currentQuantity - product.reservedQuantity;
    product.status = product.currentQuantity <= 0 ? 'Out of Stock' : product.currentQuantity <= product.minStock ? 'Low Stock' : 'In Stock';
  }
  sale.status = 'Completed';
  sale.paidAmount = sale.grandTotal;
  state.payments.push({ id: uid('PAY'), invoiceNumber: sale.invoiceNumber, amount: sale.grandTotal, method: sale.paymentMethod || 'Cash', date: new Date().toISOString().slice(0,10), remarks: 'Completed sale' });
  logActivity('Sale Updated', `${sale.invoiceNumber} completed`);
  renderAll();
  showToast('Sale completed', 'success');
}

function recordPayment(invoiceNumber) {
  const pending = state.pendingPayments.find((entry) => entry.invoiceNumber === invoiceNumber);
  if (!pending) return;
  const amount = Math.min(pending.remainingBalance, pending.pendingAmount);
  pending.paidAmount += amount;
  pending.remainingBalance = pending.pendingAmount - pending.paidAmount;
  pending.status = pending.remainingBalance <= 0 ? 'Paid' : 'Partially Paid';
  state.payments.push({ id: uid('PAY'), invoiceNumber, amount, method: 'Cash', date: new Date().toISOString().slice(0,10), remarks: 'Payment received' });
  state.settings.cashBalance += amount;
  logActivity('Payment Received', `${invoiceNumber} paid`);
  renderAll();
  showToast('Payment recorded', 'success');
}

function openSupplierModal(supplierId = null) {
  const supplier = state.suppliers.find((entry) => entry.id === supplierId);
  const html = `<div class="row"><input name="id" value="${supplier?.id || uid('S')}" placeholder="Supplier ID" required /><input name="name" value="${supplier?.name || ''}" placeholder="Supplier Name" required /></div><div class="row"><input name="phone" value="${supplier?.phone || ''}" placeholder="Phone" /><input name="email" value="${supplier?.email || ''}" placeholder="Email" /></div><textarea name="address" placeholder="Address">${supplier?.address || ''}</textarea><input type="number" name="outstandingBalance" value="${supplier?.outstandingBalance || 0}" />`;
  openModal(supplier ? 'Edit Supplier' : 'Add Supplier', html, (formData) => {
    const payload = Object.fromEntries(formData.entries());
    payload.outstandingBalance = Number(payload.outstandingBalance || 0);
    if (supplier) Object.assign(supplier, payload); else state.suppliers.push({ ...payload, products: [], purchaseHistory: 0, invoices: [] });
    closeModal();
    renderAll();
    showToast('Supplier saved', 'success');
  });
}
function editSupplier(supplierId) { openSupplierModal(supplierId); }
function openSalesmanModal(salesmanId = null) {
  const salesman = state.salesmen.find((entry) => entry.id === salesmanId);
  const html = `<div class="row"><input name="id" value="${salesman?.id || uid('SM')}" placeholder="Employee ID" required /><input name="name" value="${salesman?.name || ''}" placeholder="Name" required /></div><div class="row"><input name="phone" value="${salesman?.phone || ''}" placeholder="Phone" /><input name="email" value="${salesman?.email || ''}" placeholder="Email" /></div><textarea name="address" placeholder="Address">${salesman?.address || ''}</textarea><div class="row"><input type="number" name="salary" value="${salesman?.salary || 0}" /><input type="number" name="commissionRate" value="${salesman?.commissionRate || 0}" /></div>`;
  openModal(salesman ? 'Edit Salesman' : 'Add Salesman', html, (formData) => {
    const payload = Object.fromEntries(formData.entries());
    payload.salary = Number(payload.salary || 0);
    payload.commissionRate = Number(payload.commissionRate || 0);
    if (salesman) Object.assign(salesman, payload); else state.salesmen.push({ ...payload, todaysSales: 0, monthlySales: 0, yearlySales: 0, pendingCollections: 0, collectedAmount: 0, performanceRating: 0 });
    closeModal();
    renderAll();
    showToast('Salesman saved', 'success');
  });
}
function editSalesman(salesmanId) { openSalesmanModal(salesmanId); }

function handleGlobalSearch(event) {
  const query = event.target.value.toLowerCase();
  if (!query) return;
  const results = [];
  state.products.forEach((product) => { if (`${product.name} ${product.barcode} ${product.id}`.toLowerCase().includes(query)) results.push(`Product: ${product.name}`); });
  state.sales.forEach((sale) => { if (`${sale.invoiceNumber}`.toLowerCase().includes(query)) results.push(`Sale: ${sale.invoiceNumber}`); });
  state.suppliers.forEach((supplier) => { if (`${supplier.name} ${supplier.phone}`.toLowerCase().includes(query)) results.push(`Supplier: ${supplier.name}`); });
  state.salesmen.forEach((salesman) => { if (`${salesman.name} ${salesman.phone}`.toLowerCase().includes(query)) results.push(`Salesman: ${salesman.name}`); });
  if (results.length) showToast(results.slice(0, 5).join(' • '), 'info');
}

function exportTable(data, columns) {
  if (!data?.length) return showToast('No rows to export', 'warning');
  const rows = data.map((item) => columns.reduce((acc, column) => { const key = column.toLowerCase().replace(/ /g, ''); acc[column] = item[key] || item[column.toLowerCase().replace(/ /g, '')] || ''; return acc; }, {}));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
  XLSX.writeFile(workbook, 'export.xlsx');
}

function exportInventory() {
  const rows = state.products.map((product) => ({ Product: product.name, Category: product.category, Stock: product.currentQuantity, Value: product.currentQuantity * product.purchasePrice, Status: product.status }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
  XLSX.writeFile(workbook, 'inventory.xlsx');
}

function exportAllReports() {
  const workbook = XLSX.utils.book_new();
  const salesSheet = XLSX.utils.json_to_sheet(state.sales.map((sale) => ({ Invoice: sale.invoiceNumber, Total: sale.grandTotal, Status: sale.status })));
  const inventorySheet = XLSX.utils.json_to_sheet(state.products.map((product) => ({ Product: product.name, Stock: product.currentQuantity, Value: product.currentQuantity * product.purchasePrice })));
  XLSX.utils.book_append_sheet(workbook, salesSheet, 'Sales');
  XLSX.utils.book_append_sheet(workbook, inventorySheet, 'Inventory');
  XLSX.writeFile(workbook, 'storeflow-report.xlsx');
}

// Backup all data to JSON file
function backupData() {
  const backup = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    data: state
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `storeflow-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup created successfully', 'success');
}

// Restore data from backup file
function restoreData(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const backup = JSON.parse(e.target.result);
      if (backup.data && backup.version) {
        confirmAction('This will replace all current data. Continue?', () => {
          state = backup.data;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          renderAll();
          showToast('Data restored successfully', 'success');
        });
      } else {
        showToast('Invalid backup file', 'danger');
      }
    } catch (err) {
      showToast('Failed to parse backup file', 'danger');
    }
  };
  reader.readAsText(file);
}

function handleKeyboardShortcuts(event) {
  const target = event.target;
  const isTypingField = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    document.getElementById('globalSearch').focus();
  }

  if (event.key === '/' && !isTypingField) {
    event.preventDefault();
    document.getElementById('globalSearch').focus();
  }

  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n' && !isTypingField) {
    event.preventDefault();
    openSaleModal();
  }
}

document.addEventListener('DOMContentLoaded', init);
