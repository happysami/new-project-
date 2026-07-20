// Sample Inventory History Data
const inventoryHistoryData = [
  {
    id: 1,
    date: '2026-07-20 09:15 AM',
    itemName: 'Widget Pro X200',
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
    itemName: 'Widget Pro X200',
    store: 'Downtown Store',
    storeId: 'store-1',
    employee: 'Emily Davis',
    employeeId: 'emp-4',
    reason: 'Correction',
    reasonId: 'correction',
    adjustment: '+5',
    finalStock: 300
  },
  {
    id: 5,
    date: '2026-07-19 02:10 PM',
    itemName: 'Smart Sensor A1',
    store: 'Mall Branch',
    storeId: 'store-2',
    employee: 'John Smith',
    employeeId: 'emp-1',
    reason: 'Return',
    reasonId: 'return',
    adjustment: '+12',
    finalStock: 88
  },
  {
    id: 6,
    date: '2026-07-19 11:30 AM',
    itemName: 'Power Cell C100',
    store: 'Airport Location',
    storeId: 'store-3',
    employee: 'Sarah Johnson',
    employeeId: 'emp-2',
    reason: 'Expired',
    reasonId: 'expired',
    adjustment: '-30',
    finalStock: 270
  },
  {
    id: 7,
    date: '2026-07-18 03:45 PM',
    itemName: 'Gadget Mini S50',
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
    itemName: 'Widget Pro X200',
    store: 'Mall Branch',
    storeId: 'store-2',
    employee: 'Emily Davis',
    employeeId: 'emp-4',
    reason: 'Stock In',
    reasonId: 'stock-in',
    adjustment: '+200',
    finalStock: 600
  },
  {
    id: 9,
    date: '2026-07-17 05:15 PM',
    itemName: 'Electronic Hub Z1',
    store: 'Downtown Store',
    storeId: 'store-1',
    employee: 'John Smith',
    employeeId: 'emp-1',
    reason: 'Stock Out',
    reasonId: 'stock-out',
    adjustment: '-50',
    finalStock: 150
  },
  {
    id: 10,
    date: '2026-07-17 01:30 PM',
    itemName: 'Smart Sensor A1',
    store: 'Airport Location',
    storeId: 'store-3',
    employee: 'Sarah Johnson',
    employeeId: 'emp-2',
    reason: 'Damaged',
    reasonId: 'damaged',
    adjustment: '-15',
    finalStock: 85
  },
  {
    id: 11,
    date: '2026-07-16 09:00 AM',
    itemName: 'Power Cell C100',
    store: 'Mall Branch',
    storeId: 'store-2',
    employee: 'Mike Williams',
    employeeId: 'emp-3',
    reason: 'Correction',
    reasonId: 'correction',
    adjustment: '+10',
    finalStock: 310
  },
  {
    id: 12,
    date: '2026-07-15 04:30 PM',
    itemName: 'Widget Pro X200',
    store: 'Airport Location',
    storeId: 'store-3',
    employee: 'Emily Davis',
    employeeId: 'emp-4',
    reason: 'Return',
    reasonId: 'return',
    adjustment: '+25',
    finalStock: 425
  }
];

// State
let filteredData = [...inventoryHistoryData];
let currentPage = 1;
const itemsPerPage = 8;

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
  initializeFlatpickr();
  initializeQuickFilters();
  initializeDropdowns();
  initializeSearch();
  initializePagination();
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
  const filters = ['storeFilter', 'employeeFilter', 'reasonFilter'];
  
  filters.forEach(filterId => {
    const select = document.getElementById(filterId);
    select.addEventListener('change', filterData);
  });
}

// Initialize Search
function initializeSearch() {
  const searchInput = document.getElementById('searchInput');
  let debounceTimer;
  
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(filterData, 300);
  });
}

// Initialize Pagination
function initializePagination() {
  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable();
    }
  });
  
  document.getElementById('nextPage').addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTable();
    }
  });
}

// Filter Data
function filterData() {
  const activeQuickFilter = document.querySelector('.quick-filter-btn.active');
  const quickRange = activeQuickFilter?.dataset.range;
  const customDateRange = document.getElementById('customDateRange').value;
  const storeFilter = document.getElementById('storeFilter').value;
  const employeeFilter = document.getElementById('employeeFilter').value;
  const reasonFilter = document.getElementById('reasonFilter').value;
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  
  filteredData = inventoryHistoryData.filter(item => {
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
    if (reasonFilter && item.reasonId !== reasonFilter) return false;
    
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
  const tbody = document.getElementById('inventoryHistoryBody');
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  
  // Update pagination info
  document.getElementById('currentPage').textContent = currentPage;
  document.getElementById('totalPages').textContent = totalPages || 1;
  document.getElementById('resultCount').textContent = `Showing ${filteredData.length} results`;
  
  // Enable/disable pagination buttons
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage >= totalPages;
  
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
          <p>No inventory history found</p>
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
