// Stock Entry Module

// Sample stock data (in real app, this would come from a database)
const stockData = {
  'widget-pro-x200': { 'store-1': 450, 'store-2': 380, 'store-3': 290 },
  'gadget-mini-s50': { 'store-1': 200, 'store-2': 175, 'store-3': 120 },
  'electronic-hub-z1': { 'store-1': 150, 'store-2': 95, 'store-3': 92 },
  'smart-sensor-a1': { 'store-1': 120, 'store-2': 88, 'store-3': 85 },
  'power-cell-c100': { 'store-1': 350, 'store-2': 300, 'store-3': 270 }
};

// Sample Stock Entry Data
let stockEntryData = [
  {
    id: 1,
    date: '2026-07-20 09:15 AM',
    itemName: 'Widget Pro X200',
    itemId: 'widget-pro-x200',
    store: 'Downtown Store',
    storeId: 'store-1',
    employee: 'John Smith',
    employeeId: 'emp-1',
    reason: 'Stock In',
    reasonId: 'stock-in',
    adjustment: '+150',
    finalStock: 450
  },
  {
    id: 2,
    date: '2026-07-20 08:30 AM',
    itemName: 'Gadget Mini S50',
    itemId: 'gadget-mini-s50',
    store: 'Mall Branch',
    storeId: 'store-2',
    employee: 'Sarah Johnson',
    employeeId: 'emp-2',
    reason: 'Stock Out',
    reasonId: 'stock-out',
    adjustment: '-25',
    finalStock: 175
  },
  {
    id: 3,
    date: '2026-07-20 07:45 AM',
    itemName: 'Electronic Hub Z1',
    itemId: 'electronic-hub-z1',
    store: 'Airport Location',
    storeId: 'store-3',
    employee: 'Mike Williams',
    employeeId: 'emp-3',
    reason: 'Damaged',
    reasonId: 'damaged',
    adjustment: '-8',
    finalStock: 92
  },
  {
    id: 4,
    date: '2026-07-19 04:20 PM',
    itemName: 'Smart Sensor A1',
    itemId: 'smart-sensor-a1',
    store: 'Downtown Store',
    storeId: 'store-1',
    employee: 'Emily Davis',
    employeeId: 'emp-4',
    reason: 'Correction',
    reasonId: 'correction',
    adjustment: '+5',
    finalStock: 120
  },
  {
    id: 5,
    date: '2026-07-19 02:10 PM',
    itemName: 'Power Cell C100',
    itemId: 'power-cell-c100',
    store: 'Mall Branch',
    storeId: 'store-2',
    employee: 'John Smith',
    employeeId: 'emp-1',
    reason: 'Return',
    reasonId: 'return',
    adjustment: '+12',
    finalStock: 300
  },
  {
    id: 6,
    date: '2026-07-19 11:30 AM',
    itemName: 'Widget Pro X200',
    itemId: 'widget-pro-x200',
    store: 'Airport Location',
    storeId: 'store-3',
    employee: 'Sarah Johnson',
    employeeId: 'emp-2',
    reason: 'Expired',
    reasonId: 'expired',
    adjustment: '-30',
    finalStock: 260
  },
  {
    id: 7,
    date: '2026-07-18 03:45 PM',
    itemName: 'Gadget Mini S50',
    itemId: 'gadget-mini-s50',
    store: 'Downtown Store',
    storeId: 'store-1',
    employee: 'Mike Williams',
    employeeId: 'emp-3',
    reason: 'Theft/Loss',
    reasonId: 'theft',
    adjustment: '-3',
    finalStock: 197
  },
  {
    id: 8,
    date: '2026-07-18 10:00 AM',
    itemName: 'Electronic Hub Z1',
    itemId: 'electronic-hub-z1',
    store: 'Mall Branch',
    storeId: 'store-2',
    employee: 'Emily Davis',
    employeeId: 'emp-4',
    reason: 'Stock In',
    reasonId: 'stock-in',
    adjustment: '+200',
    finalStock: 295
  },
  {
    id: 9,
    date: '2026-07-17 05:15 PM',
    itemName: 'Smart Sensor A1',
    itemId: 'smart-sensor-a1',
    store: 'Downtown Store',
    storeId: 'store-1',
    employee: 'John Smith',
    employeeId: 'emp-1',
    reason: 'Stock Out',
    reasonId: 'stock-out',
    adjustment: '-50',
    finalStock: 65
  },
  {
    id: 10,
    date: '2026-07-17 01:30 PM',
    itemName: 'Power Cell C100',
    itemId: 'power-cell-c100',
    store: 'Airport Location',
    storeId: 'store-3',
    employee: 'Sarah Johnson',
    employeeId: 'emp-2',
    reason: 'Damaged',
    reasonId: 'damaged',
    adjustment: '-15',
    finalStock: 255
  },
  {
    id: 11,
    date: '2026-07-16 09:00 AM',
    itemName: 'Widget Pro X200',
    itemId: 'widget-pro-x200',
    store: 'Mall Branch',
    storeId: 'store-2',
    employee: 'Mike Williams',
    employeeId: 'emp-3',
    reason: 'Correction',
    reasonId: 'correction',
    adjustment: '+10',
    finalStock: 370
  },
  {
    id: 12,
    date: '2026-07-15 04:30 PM',
    itemName: 'Gadget Mini S50',
    itemId: 'gadget-mini-s50',
    store: 'Airport Location',
    storeId: 'store-3',
    employee: 'Emily Davis',
    employeeId: 'emp-4',
    reason: 'Return',
    reasonId: 'return',
    adjustment: '+25',
    finalStock: 145
  }
];

const adjustmentTypes = {
  'stock-in': { symbol: '+', label: 'Stock In', class: 'positive' },
  'stock-out': { symbol: '-', label: 'Stock Out', class: 'negative' },
  'damaged': { symbol: '-', label: 'Damaged', class: 'negative' },
  'expired': { symbol: '-', label: 'Expired', class: 'negative' },
  'correction': { symbol: '±', label: 'Correction', class: 'neutral' },
  'return': { symbol: '+', label: 'Return', class: 'positive' },
  'theft': { symbol: '-', label: 'Theft/Loss', class: 'negative' }
};

// State
let filteredData = [...stockEntryData];
let currentPage = 1;
const itemsPerPage = 8;

// DOM Elements
const form = document.getElementById('stockEntryForm');
const itemSelect = document.getElementById('itemName');
const storeSelect = document.getElementById('storeLocation');
const quantityInput = document.getElementById('quantity');
const currentStockInput = document.getElementById('currentStock');
const adjustmentTypeSelect = document.getElementById('adjustmentType');
const clearBtn = document.getElementById('clearBtn');

// Preview elements
const previewItem = document.getElementById('previewItem');
const previewStore = document.getElementById('previewStore');
const previewAdjustment = document.getElementById('previewAdjustment');
const previewNewStock = document.getElementById('previewNewStock');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeFlatpickr();
  initializeQuickFilters();
  initializeDropdowns();
  initializeSearch();
  initializePagination();
  initializeFormEvents();
  renderTable();
});

// Initialize Flatpickr for custom date range
function initializeFlatpickr() {
  flatpickr('#customDateRange', {
    mode: 'range',
    dateFormat: 'Y-m-d',
    onChange: (selectedDates) => {
      if (selectedDates.length === 2) {
        filterData();
      }
    }
  });
}

// Initialize Quick Filter Buttons
function initializeQuickFilters() {
  const quickFilterBtns = document.querySelectorAll('.quick-filter-btn');
  
  quickFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      quickFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Clear custom date picker
      document.getElementById('customDateRange').value = '';
      
      filterData();
    });
  });
}

// Initialize Dropdown Filters
function initializeDropdowns() {
  const filters = ['storeFilter', 'employeeFilter', 'typeFilter'];
  
  filters.forEach(filterId => {
    const select = document.getElementById(filterId);
    if (select) {
      select.addEventListener('change', filterData);
    }
  });
}

// Initialize Search
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(filterData, 300);
    });
  }
}

// Initialize Pagination
function initializePagination() {
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderTable();
      }
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderTable();
      }
    });
  }
}

// Initialize Form Event Listeners
function initializeFormEvents() {
  itemSelect.addEventListener('change', updateCurrentStock);
  storeSelect.addEventListener('change', updateCurrentStock);
  quantityInput.addEventListener('input', updatePreview);
  adjustmentTypeSelect.addEventListener('change', updatePreview);
  
  form.addEventListener('submit', handleSubmit);
  clearBtn.addEventListener('click', handleClear);
}

// Filter Data
function filterData() {
  const activeQuickFilter = document.querySelector('.quick-filter-btn.active');
  const quickRange = activeQuickFilter?.dataset.range;
  const customDateRange = document.getElementById('customDateRange')?.value || '';
  const storeFilter = document.getElementById('storeFilter')?.value || '';
  const employeeFilter = document.getElementById('employeeFilter')?.value || '';
  const typeFilter = document.getElementById('typeFilter')?.value || '';
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
  
  filteredData = stockEntryData.filter(item => {
    // Quick Date Filter
    if (quickRange && !customDateRange) {
      const itemDate = new Date(item.date);
      const today = new Date();
      
      switch (quickRange) {
        case 'today':
          if (itemDate.toDateString() !== today.toDateString()) return false;
          break;
        case 'yesterday':
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          if (itemDate.toDateString() !== yesterday.toDateString()) return false;
          break;
        case 'this-week':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          if (itemDate < weekStart) return false;
          break;
        case 'this-month':
          if (itemDate.getMonth() !== today.getMonth() || itemDate.getFullYear() !== today.getFullYear()) return false;
          break;
      }
    }
    
    // Custom Date Range Filter
    if (customDateRange) {
      const dates = customDateRange.split(' to ');
      if (dates.length === 2) {
        const startDate = new Date(dates[0]);
        const endDate = new Date(dates[1]);
        const itemDate = new Date(item.date);
        if (itemDate < startDate || itemDate > endDate) return false;
      }
    }
    
    // Dropdown Filters
    if (storeFilter && item.storeId !== storeFilter) return false;
    if (employeeFilter && item.employeeId !== employeeFilter) return false;
    if (typeFilter && item.reasonId !== typeFilter) return false;
    
    // Search Filter
    if (searchTerm) {
      const searchFields = [item.itemName, item.employee, item.reason, item.store].map(s => s.toLowerCase());
      if (!searchFields.some(field => field.includes(searchTerm))) return false;
    }
    
    return true;
  });
  
  currentPage = 1;
  renderTable();
}

// Render Table
function renderTable() {
  const tbody = document.getElementById('stockEntryBody');
  if (!tbody) return;
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  // Update pagination info
  const resultCountEl = document.getElementById('resultCount');
  const currentPageEl = document.getElementById('currentPage');
  const totalPagesEl = document.getElementById('totalPages');
  
  if (resultCountEl) resultCountEl.textContent = `Showing ${filteredData.length} results`;
  if (currentPageEl) currentPageEl.textContent = currentPage;
  if (totalPagesEl) totalPagesEl.textContent = totalPages || 1;
  
  // Enable/disable pagination buttons
  const prevBtn = document.getElementById('prevPage');
  const nextBtn = document.getElementById('nextPage');
  if (prevBtn) prevBtn.disabled = currentPage === 1;
  if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
  
  // Calculate pagination
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageData = filteredData.slice(startIndex, endIndex);
  
  // Render rows
  if (pageData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p>No stock entries found</p>
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = pageData.map(item => `
    <tr>
      <td>${item.date}</td>
      <td><strong>${item.itemName}</strong></td>
      <td>${item.store}</td>
      <td>${item.employee}</td>
      <td><span class="reason-badge reason-${item.reasonId}">${item.reason}</span></td>
      <td class="text-center">
        <span class="adjustment ${item.adjustment.startsWith('+') ? 'positive' : 'negative'}">
          ${item.adjustment}
        </span>
      </td>
      <td class="text-right"><strong>${item.finalStock}</strong></td>
    </tr>
  `).join('');
}

// Update current stock based on selected item and store
function updateCurrentStock() {
  const item = itemSelect.value;
  const store = storeSelect.value;
  
  if (item && store && stockData[item] && stockData[item][store] !== undefined) {
    currentStockInput.value = stockData[item][store];
  } else {
    currentStockInput.value = '--';
  }
  
  updatePreview();
}

// Update preview card
function updatePreview() {
  const item = itemSelect.options[itemSelect.selectedIndex]?.text || '--';
  const store = storeSelect.options[storeSelect.selectedIndex]?.text || '--';
  const quantity = parseInt(quantityInput.value) || 0;
  const adjType = adjustmentTypeSelect.value;
  
  const adjInfo = adjustmentTypes[adjType] || { symbol: '', label: '--' };
  const currentStock = parseInt(currentStockInput.value) || 0;
  
  // Calculate new stock
  let newStock = currentStock;
  if (adjType === 'stock-in' || adjType === 'return') {
    newStock = currentStock + quantity;
  } else if (adjType === 'stock-out' || adjType === 'damaged' || adjType === 'expired' || adjType === 'theft') {
    newStock = currentStock - quantity;
  } else if (adjType === 'correction') {
    newStock = currentStock + quantity;
  }
  
  // Update preview
  previewItem.textContent = item !== 'Select an item...' ? item : '--';
  previewStore.textContent = store !== 'Select store...' ? store : '--';
  previewAdjustment.textContent = quantity > 0 
    ? `${adjInfo.symbol}${quantity} (${adjInfo.label})` 
    : '--';
  
  // Color code the new stock
  if (newStock !== currentStock && currentStock !== '--') {
    if (newStock > currentStock) {
      previewNewStock.innerHTML = `<span class="positive">${newStock}</span> <span class="stock-change">(+${newStock - currentStock})</span>`;
    } else if (newStock < currentStock) {
      previewNewStock.innerHTML = `<span class="negative">${newStock}</span> <span class="stock-change">(${newStock - currentStock})</span>`;
    } else {
      previewNewStock.textContent = newStock;
    }
  } else {
    previewNewStock.textContent = newStock || '--';
  }
}

// Handle form submission
function handleSubmit(e) {
  e.preventDefault();
  
  const entry = {
    item: itemSelect.options[itemSelect.selectedIndex].text,
    itemId: itemSelect.value,
    store: storeSelect.options[storeSelect.selectedIndex].text,
    storeId: storeSelect.value,
    employee: document.getElementById('employee').options[document.getElementById('employee').selectedIndex].text,
    employeeId: document.getElementById('employee').value,
    adjustmentType: adjustmentTypeSelect.value,
    adjustmentLabel: adjustmentTypes[adjustmentTypeSelect.value]?.label,
    quantity: parseInt(quantityInput.value),
    reference: document.getElementById('reference').value,
    notes: document.getElementById('notes').value,
    timestamp: new Date()
  };
  
  // Validate
  if (!entry.itemId || !entry.storeId || !entry.employeeId || !entry.quantity) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  // Calculate new stock
  const currentStock = stockData[entry.itemId]?.[entry.storeId] || 0;
  let newStock = currentStock;
  if (entry.adjustmentType === 'stock-in' || entry.adjustmentType === 'return') {
    newStock = currentStock + entry.quantity;
  } else if (entry.adjustmentType !== 'correction') {
    newStock = currentStock - entry.quantity;
  }
  
  // Create new entry object
  const newEntry = {
    id: stockEntryData.length + 1,
    date: entry.timestamp.toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: true }),
    itemName: entry.item,
    itemId: entry.itemId,
    store: entry.store,
    storeId: entry.storeId,
    employee: entry.employee,
    employeeId: entry.employeeId,
    reason: entry.adjustmentLabel,
    reasonId: entry.adjustmentType,
    adjustment: adjustmentTypes[entry.adjustmentType].symbol + entry.quantity,
    finalStock: newStock
  };
  
  // Add to beginning of data array
  stockEntryData.unshift(newEntry);
  
  // Update stock data
  if (stockData[entry.itemId]) {
    if (entry.adjustmentType === 'stock-in' || entry.adjustmentType === 'return') {
      stockData[entry.itemId][entry.storeId] += entry.quantity;
    } else if (entry.adjustmentType !== 'correction') {
      stockData[entry.itemId][entry.storeId] -= entry.quantity;
    }
  }
  
  // Show success message
  showToast(`Stock entry added successfully! ${adjustmentTypes[entry.adjustmentType].symbol}${entry.quantity} ${entry.item}`, 'success');
  
  // Clear form
  handleClear();
  
  // Re-filter and render table
  filterData();
}

// Handle clear button
function handleClear() {
  form.reset();
  currentStockInput.value = '--';
  updatePreview();
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
