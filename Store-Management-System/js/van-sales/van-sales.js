// Van Sales Module

// Sample data stores
const stockData = {
  'gihone-5l': { 'main-store': 450, 'van-01': 0, 'van-02': 0, 'van-03': 0 },
  'widget-pro-x200': { 'main-store': 380, 'van-01': 0, 'van-02': 0, 'van-03': 0 },
  'gadget-mini-s50': { 'main-store': 175, 'van-01': 0, 'van-02': 0, 'van-03': 0 },
  'electronic-hub-z1': { 'main-store': 95, 'van-01': 0, 'van-02': 0, 'van-03': 0 },
  'smart-sensor-a1': { 'main-store': 88, 'van-01': 0, 'van-02': 0, 'van-03': 0 }
};

const salesmenData = [
  { id: 'salesman-1', name: 'John Smith', van: 'van-01' },
  { id: 'salesman-2', name: 'Sarah Johnson', van: 'van-02' },
  { id: 'salesman-3', name: 'Mike Williams', van: 'van-03' },
  { id: 'salesman-4', name: 'Emily Davis', van: null }
];

const vanData = [
  { id: 'van-01', name: 'Van 01', driver: 'John Smith', driverId: 'salesman-1' },
  { id: 'van-02', name: 'Van 02', driver: 'Sarah Johnson', driverId: 'salesman-2' },
  { id: 'van-03', name: 'Van 03', driver: 'Mike Williams', driverId: 'salesman-3' }
];

const productNames = {
  'gihone-5l': 'Gihone 5L',
  'widget-pro-x200': 'Widget Pro X200',
  'gadget-mini-s50': 'Gadget Mini S50',
  'electronic-hub-z1': 'Electronic Hub Z1',
  'smart-sensor-a1': 'Smart Sensor A1'
};

const productPrices = {
  'gihone-5l': 45.00,
  'widget-pro-x200': 120.00,
  'gadget-mini-s50': 65.00,
  'electronic-hub-z1': 89.00,
  'smart-sensor-a1': 35.00
};

// State
let vanStockTransfers = [];
let routeSettlements = [];
let currentRouteData = null;

// Get today's date in YYYY-MM-DD format
const getToday = () => new Date().toISOString().split('T')[0];

// Get formatted time string
const getFormattedTime = () => {
  const now = new Date();
  return now.toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
};

// Sample route data (simulating loaded stock for today)
let activeRoutes = {
  'van-01-salesman-1': {
    van: 'van-01',
    salesman: 'John Smith',
    salesmanId: 'salesman-1',
    date: getToday(),
    loadedStock: {
      'gihone-5l': { loaded: 100, sold: 65 },
      'widget-pro-x200': { loaded: 50, sold: 30 },
      'gadget-mini-s50': { loaded: 75, sold: 40 }
    },
    expectedCash: 6925.00
  },
  'van-02-salesman-2': {
    van: 'van-02',
    salesman: 'Sarah Johnson',
    salesmanId: 'salesman-2',
    date: getToday(),
    loadedStock: {
      'gihone-5l': { loaded: 80, sold: 55 },
      'electronic-hub-z1': { loaded: 40, sold: 25 }
    },
    expectedCash: 4325.00
  }
};

// DOM Elements
const issueStockForm = document.getElementById('issueStockForm');
const routeSettlementForm = document.getElementById('routeSettlementForm');
const salesmanSelect = document.getElementById('salesmanSelect');
const vanSelect = document.getElementById('vanSelect');
const productSelect = document.getElementById('productSelect');
const quantityToLoad = document.getElementById('quantityToLoad');
const availableStock = document.getElementById('availableStock');
const activeVanSelect = document.getElementById('activeVanSelect');
const cashReceived = document.getElementById('cashReceived');
const totalExpectedCash = document.getElementById('totalExpectedCash');
const cashVariance = document.getElementById('cashVariance');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeIssueStockForm();
  initializeRouteSettlementForm();
  syncStockDataWithHTML();
  updateActiveVanDates();
  loadSampleData();
});

// Sync stock data from JS to HTML
function syncStockDataWithHTML() {
  // Update product select options with current stock data
  const productStocks = document.querySelectorAll('.product-stock');
  productStocks.forEach(el => {
    const productId = el.dataset.product;
    if (productId && stockData[productId]) {
      el.textContent = stockData[productId]['main-store'];
      // Update the data-stock attribute on parent option
      const option = el.closest('option');
      if (option) {
        option.dataset.stock = stockData[productId]['main-store'];
      }
    }
  });
}

// Update active van options with today's date
function updateActiveVanDates() {
  const activeVanOptions = document.querySelectorAll('#activeVanSelect option[data-date]');
  activeVanOptions.forEach(option => {
    option.dataset.date = getToday();
  });
}

// Tab Navigation
function initializeTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
    });
  });
}

// Issue Stock Form
function initializeIssueStockForm() {
  // Update available stock when product is selected
  if (productSelect) {
    productSelect.addEventListener('change', () => {
      const selectedOption = productSelect.options[productSelect.selectedIndex];
      const stock = selectedOption.dataset.stock || '--';
      if (availableStock) {
        availableStock.textContent = stock;
      }
      validateLoadQuantity();
    });
  }
  
  // Validate quantity
  if (quantityToLoad) {
    quantityToLoad.addEventListener('input', validateLoadQuantity);
  }
  
  // Auto-select van based on salesman
  if (salesmanSelect && vanSelect) {
    salesmanSelect.addEventListener('change', () => {
      const salesmanId = salesmanSelect.value;
      const salesman = salesmenData.find(s => s.id === salesmanId);
      if (salesman && salesman.van) {
        vanSelect.value = salesman.van;
      }
    });
  }
  
  // Form submission
  if (issueStockForm) {
    issueStockForm.addEventListener('submit', handleIssueStock);
  }
}

function validateLoadQuantity() {
  const selectedOption = productSelect?.options[productSelect.selectedIndex];
  const maxStock = parseInt(selectedOption?.dataset.stock) || 0;
  const qty = parseInt(quantityToLoad?.value) || 0;
  
  if (quantityToLoad && qty > maxStock) {
    quantityToLoad.setCustomValidity(`Maximum available stock is ${maxStock}`);
    quantityToLoad.reportValidity();
  } else if (quantityToLoad) {
    quantityToLoad.setCustomValidity('');
  }
}

function handleIssueStock(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  const salesmanId = salesmanSelect.value;
  const vanId = vanSelect.value;
  const productId = productSelect.value;
  const qty = parseInt(quantityToLoad.value);
  
  if (!salesmanId || !vanId || !productId || !qty) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  if (qty <= 0) {
    showToast('Quantity must be greater than zero', 'error');
    return;
  }
  
  const selectedOption = productSelect.options[productSelect.selectedIndex];
  const stock = parseInt(selectedOption.dataset.stock) || 0;
  
  if (qty > stock) {
    showToast('Insufficient stock in Main Store', 'error');
    return;
  }
  
  // Show loading state
  setLoadingState(submitBtn, true);
  
  // Simulate async operation
  setTimeout(() => {
    const salesman = salesmenData.find(s => s.id === salesmanId);
    const van = vanData.find(v => v.id === vanId);
    
    // Create transfer record
    const transfer = {
      id: vanStockTransfers.length + 1,
      date: new Date().toLocaleString('en-US', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true
      }),
      van: van.name,
      vanId: vanId,
      driver: salesman.name,
      driverId: salesmanId,
      product: productNames[productId],
      productId: productId,
      quantity: qty,
      status: 'Loaded',
      timestamp: new Date().toISOString()
    };
    
    // Update stock data
    stockData[productId]['main-store'] -= qty;
    stockData[productId][vanId] += qty;
    
    // Update active route if exists
    const routeKey = `${vanId}-${salesmanId}`;
    if (activeRoutes[routeKey]) {
      if (!activeRoutes[routeKey].loadedStock[productId]) {
        activeRoutes[routeKey].loadedStock[productId] = { loaded: 0, sold: 0 };
      }
      activeRoutes[routeKey].loadedStock[productId].loaded += qty;
    } else {
      activeRoutes[routeKey] = {
        van: vanId,
        salesman: salesman.name,
        salesmanId: salesmanId,
        date: new Date().toISOString().split('T')[0],
        loadedStock: {
          [productId]: { loaded: qty, sold: 0 }
        },
        expectedCash: 0
      };
    }
    
    // Add to transfers list
    vanStockTransfers.unshift(transfer);
    
    // Add to inventory history
    addInventoryHistoryEntry({
      type: 'transfer',
      subType: 'van-loading',
      item: productNames[productId],
      itemId: productId,
      quantity: -qty,
      from: 'Main Store',
      to: van.name,
      reference: `Transfer #${transfer.id}`,
      timestamp: transfer.timestamp
    });
    
    showToast(`Successfully loaded ${qty} units of ${productNames[productId]} to ${van.name}`, 'success');
    
    // Reset form and update table
    issueStockForm.reset();
    if (availableStock) availableStock.textContent = '--';
    renderRecentLoads();
    
    // Update stock display in product options
    syncStockDataWithHTML();
    
    // Reset loading state
    setLoadingState(submitBtn, false);
  }, 300);
}

function setLoadingState(button, isLoading) {
  if (!button) return;
  
  if (isLoading) {
    button.disabled = true;
    button.dataset.originalText = button.innerHTML;
    button.innerHTML = `
      <svg class="spinner" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round">
          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
        </path>
      </svg>
      Loading...
    `;
  } else {
    button.disabled = false;
    button.innerHTML = button.dataset.originalText || 'Load Van';
  }
}

function renderRecentLoads() {
  const tbody = document.getElementById('recentLoadsBody');
  if (!tbody) return;
  
  if (vanStockTransfers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No recent transfers</td></tr>';
    return;
  }
  
  tbody.innerHTML = vanStockTransfers.slice(0, 10).map(transfer => `
    <tr>
      <td>${transfer.date}</td>
      <td>${transfer.van}</td>
      <td>${transfer.driver}</td>
      <td><strong>${transfer.product}</strong></td>
      <td class="text-center positive">+${transfer.quantity}</td>
      <td><span class="status-badge status-loaded">${transfer.status}</span></td>
    </tr>
  `).join('');
}

// Route Settlement
function initializeRouteSettlementForm() {
  if (activeVanSelect) {
    activeVanSelect.addEventListener('change', handleActiveVanChange);
  }
  
  if (cashReceived) {
    cashReceived.addEventListener('input', updateCashVariance);
  }
  
  if (routeSettlementForm) {
    routeSettlementForm.addEventListener('submit', handleRouteSettlement);
  }
}

function handleActiveVanChange() {
  const routeKey = activeVanSelect.value;
  
  if (!routeKey) {
    currentRouteData = null;
    renderSettlementTable();
    if (totalExpectedCash) totalExpectedCash.textContent = 'GHS 0.00';
    return;
  }
  
  currentRouteData = activeRoutes[routeKey];
  
  if (currentRouteData) {
    renderSettlementTable();
    if (totalExpectedCash) {
      const expectedCash = calculateExpectedCash();
      currentRouteData.expectedCash = expectedCash;
      totalExpectedCash.textContent = `GHS ${expectedCash.toFixed(2)}`;
    }
    updateCashVariance();
  }
}

function calculateExpectedCash() {
  if (!currentRouteData) return 0;
  
  let total = 0;
  for (const [productId, data] of Object.entries(currentRouteData.loadedStock)) {
    const sold = data.sold || 0;
    const price = productPrices[productId] || 0;
    total += sold * price;
  }
  return total;
}

function renderSettlementTable() {
  const tbody = document.getElementById('settlementBody');
  if (!tbody) return;
  
  if (!currentRouteData) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Select an active route to view details</td></tr>';
    return;
  }
  
  const rows = [];
  for (const [productId, data] of Object.entries(currentRouteData.loadedStock)) {
    const loaded = data.loaded || 0;
    const sold = data.sold || 0;
    const expected = loaded - sold;
    const price = productPrices[productId] || 0;
    
    rows.push(`
      <tr data-product="${productId}">
        <td><strong>${productNames[productId] || productId}</strong></td>
        <td class="text-center">${loaded}</td>
        <td class="text-center negative">${sold}</td>
        <td class="text-center">${expected}</td>
        <td>
          <input type="number" class="return-input" 
            data-product="${productId}" 
            data-expected="${expected}"
            min="0" max="${expected + (sold > 0 ? sold : 0)}" 
            value="${expected}" />
        </td>
        <td>
          <input type="number" class="damaged-input" 
            data-product="${productId}" 
            data-loaded="${loaded}"
            data-sold="${sold}"
            min="0" max="${loaded}" 
            value="0" readonly />
        </td>
      </tr>
    `);
  }
  
  tbody.innerHTML = rows.join('');
  
  // Add event listeners for return inputs
  tbody.querySelectorAll('.return-input').forEach(input => {
    input.addEventListener('input', handleReturnInputChange);
  });
}

function handleReturnInputChange(e) {
  const input = e.target;
  const productId = input.dataset.product;
  const expected = parseInt(input.dataset.expected) || 0;
  const loaded = parseInt(document.querySelector(`.damaged-input[data-product="${productId}"]`)?.dataset.loaded) || 0;
  const sold = parseInt(document.querySelector(`.damaged-input[data-product="${productId}"]`)?.dataset.sold) || 0;
  let returned = parseInt(input.value) || 0;
  
  // Prevent negative values
  returned = Math.max(0, returned);
  input.value = returned;
  
  // Calculate damaged/missing (never negative)
  const damaged = Math.max(0, loaded - sold - returned);
  const damagedInput = document.querySelector(`.damaged-input[data-product="${productId}"]`);
  if (damagedInput) {
    damagedInput.value = damaged;
  }
}

function updateCashVariance() {
  const received = parseFloat(cashReceived?.value) || 0;
  const expected = currentRouteData?.expectedCash || 0;
  const variance = received - expected;
  
  if (cashVariance) {
    cashVariance.textContent = `GHS ${variance.toFixed(2)}`;
    cashVariance.className = 'cash-value' + (variance === 0 ? '' : variance > 0 ? ' positive' : ' negative');
  }
}

function handleRouteSettlement(e) {
  e.preventDefault();
  
  const submitBtn = e.target.querySelector('button[type="submit"]');
  
  if (!currentRouteData) {
    showToast('Please select an active route', 'error');
    return;
  }
  
  // Validate cash received
  const cashReceivedValue = parseFloat(cashReceived?.value) || 0;
  if (cashReceivedValue < 0) {
    showToast('Cash received cannot be negative', 'error');
    return;
  }
  
  // Collect settlement data
  const settlementData = {
    van: currentRouteData.van,
    salesman: currentRouteData.salesman,
    salesmanId: currentRouteData.salesmanId,
    date: new Date().toISOString().split('T')[0],
    items: [],
    totalReturned: 0,
    totalDamaged: 0,
    expectedCash: currentRouteData.expectedCash,
    cashReceived: cashReceivedValue,
    cashVariance: 0,
    timestamp: new Date().toISOString()
  };
  
  // Process each product
  const returnInputs = document.querySelectorAll('.return-input');
  const damagedInputs = document.querySelectorAll('.damaged-input');
  
  returnInputs.forEach(input => {
    const productId = input.dataset.product;
    let returned = parseInt(input.value) || 0;
    const damagedInput = document.querySelector(`.damaged-input[data-product="${productId}"]`);
    let damaged = parseInt(damagedInput?.value) || 0;
    const loaded = currentRouteData.loadedStock[productId]?.loaded || 0;
    const sold = currentRouteData.loadedStock[productId]?.sold || 0;
    
    // Ensure non-negative values
    returned = Math.max(0, returned);
    damaged = Math.max(0, damaged);
    
    if (loaded > 0) {
      settlementData.items.push({
        productId,
        productName: productNames[productId],
        loaded,
        sold,
        returned,
        damaged,
        price: productPrices[productId]
      });
      
      settlementData.totalReturned += returned;
      settlementData.totalDamaged += damaged;
      
      // Return stock to main store
      stockData[productId]['main-store'] += returned;
      
      // Record inventory adjustment for damaged items
      if (damaged > 0) {
        addInventoryHistoryEntry({
          type: 'adjustment',
          subType: 'van-damaged',
          item: productNames[productId],
          itemId: productId,
          quantity: -damaged,
          reason: 'Damaged during route',
          reference: `Settlement - ${currentRouteData.van}`,
          timestamp: settlementData.timestamp
        });
      }
      
      // Reset van inventory
      stockData[productId][currentRouteData.van] = 0;
    }
  });
  
  settlementData.cashVariance = settlementData.cashReceived - settlementData.expectedCash;
  
  // Show loading state
  setLoadingState(submitBtn, true);
  
  // Simulate async operation
  setTimeout(() => {
    // Add to settlements list
    routeSettlements.unshift(settlementData);
    
    // Log to inventory history
    addInventoryHistoryEntry({
      type: 'settlement',
      subType: 'van-settlement',
      van: currentRouteData.van,
      salesman: currentRouteData.salesman,
      items: settlementData.items,
      totalReturned: settlementData.totalReturned,
      totalDamaged: settlementData.totalDamaged,
      cashCollected: settlementData.cashReceived,
      reference: `Route Settlement - ${settlementData.date}`,
      timestamp: settlementData.timestamp
    });
    
    // Clear active route
    const routeKey = `${currentRouteData.van}-${currentRouteData.salesmanId}`;
    delete activeRoutes[routeKey];
    
    showToast('Route settlement completed successfully!', 'success');
    
    // Reset form
    routeSettlementForm.reset();
    currentRouteData = null;
    renderSettlementTable();
    if (totalExpectedCash) totalExpectedCash.textContent = 'GHS 0.00';
    if (cashVariance) {
      cashVariance.textContent = 'GHS 0.00';
      cashVariance.className = 'cash-value';
    }
    renderSettlementHistory();
    
    // Reset loading state
    setLoadingState(submitBtn, false);
  }, 300);
}

function renderSettlementHistory() {
  const tbody = document.getElementById('settlementHistoryBody');
  if (!tbody) return;
  
  if (routeSettlements.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No settlement records</td></tr>';
    return;
  }
  
  tbody.innerHTML = routeSettlements.slice(0, 10).map(settlement => `
    <tr>
      <td>${formatDate(settlement.date)}</td>
      <td>${settlement.van}</td>
      <td>${settlement.salesman}</td>
      <td class="text-center positive">${settlement.totalReturned}</td>
      <td class="text-center negative">${settlement.totalDamaged}</td>
      <td class="text-right">GHS ${settlement.cashReceived.toFixed(2)}</td>
      <td><span class="status-badge status-completed">Completed</span></td>
    </tr>
  `).join('');
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
}

// Inventory History Integration
function addInventoryHistoryEntry(entry) {
  // This would integrate with the actual inventory history system
  // For now, we'll just log it
  console.log('Inventory History Entry:', entry);
  
  // Store in localStorage for demo purposes
  const history = JSON.parse(localStorage.getItem('vanInventoryHistory') || '[]');
  history.unshift(entry);
  localStorage.setItem('vanInventoryHistory', JSON.stringify(history.slice(0, 100)));
}

// Load sample data
function loadSampleData() {
  // Add some sample transfers with dynamic dates
  const today = getFormattedTime();
  vanStockTransfers = [
    {
      id: 1,
      date: today,
      van: 'Van 01',
      vanId: 'van-01',
      driver: 'John Smith',
      driverId: 'salesman-1',
      product: 'Gihone 5L',
      productId: 'gihone-5l',
      quantity: 100,
      status: 'Loaded',
      timestamp: new Date().toISOString()
    },
    {
      id: 2,
      date: today,
      van: 'Van 02',
      vanId: 'van-02',
      driver: 'Sarah Johnson',
      driverId: 'salesman-2',
      product: 'Widget Pro X200',
      productId: 'widget-pro-x200',
      quantity: 50,
      status: 'Loaded',
      timestamp: new Date().toISOString()
    }
  ];
  
  renderRecentLoads();
}

// Toast notification
function showToast(message, type = 'info') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) existingToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 24px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    background: ${type === 'success' ? '#16a34a' : type === 'error' ? '#dc2626' : '#2563eb'};
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
