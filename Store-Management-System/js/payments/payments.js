@ -0,0 +1,300 @@
// Pending Payments Module
// Uses Firebase Firestore for data persistence

let pendingPayments = [];
let currentFilter = '';

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  const isLoggedIn = localStorage.getItem('storeflow_logged_in') === 'true';
  if (!isLoggedIn) {
    window.location.href = '../login.html';
    return;
  }

  initTabs();
  initFilters();
  await loadPendingPayments();
}

// Tab Navigation
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.dataset.tab;
      
      // Update active tab button
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // Show/hide tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// Initialize Filters
function initFilters() {
  const statusFilter = document.getElementById('status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (e) => {
      currentFilter = e.target.value;
      renderPendingPayments();
    });
  }
}

// Load Pending Payments from Firebase
async function loadPendingPayments() {
  try {
    // For demo purposes, using localStorage - replace with Firebase Firestore calls
    const stored = localStorage.getItem('pending_payments');
    pendingPayments = stored ? JSON.parse(stored) : getDemoPendingPayments();
    renderPendingPayments();
    updateStats();
  } catch (error) {
    console.error('Error loading pending payments:', error);
    showToast('Error loading payments', 'error');
  }
}

// Demo data for testing
function getDemoPendingPayments() {
  return [
    {
      id: 'pp-001',
      invoiceNumber: 'INV-2025-001',
      customerName: 'Abebe Kebede',
      customerPhone: '0912345678',
      expectedDate: '2026-07-20',
      amount: 15000,
      status: 'waiting',
      salesmanName: 'Tigist Haile',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pp-002',
      invoiceNumber: 'INV-2025-002',
      customerName: ' Almaz Girma',
      customerPhone: '0923456789',
      expectedDate: '2026-07-15',
      amount: 8500,
      status: 'waiting',
      salesmanName: 'Tigist Haile',
      createdAt: new Date().toISOString()
    },
    {
      id: 'pp-003',
      invoiceNumber: 'INV-2025-003',
      customerName: 'Kassa Berhanu',
      customerPhone: '0934567890',
      expectedDate: '2026-07-10',
      amount: 22000,
      status: 'paid',
      paidDate: '2026-07-12',
      salesmanName: 'Samuel Tekle',
      createdAt: new Date().toISOString()
    }
  ];
}

// Save to localStorage (replace with Firebase)
function savePendingPayments() {
  localStorage.setItem('pending_payments', JSON.stringify(pendingPayments));
}

// Render Pending Payments Table
function renderPendingPayments() {
  const tbody = document.getElementById('pending-tbody');
  if (!tbody) return;

  let filtered = pendingPayments;
  if (currentFilter) {
    filtered = pendingPayments.filter(p => p.status === currentFilter);
  }

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No pending payments found</td></tr>';
    return;
  }

  const today = new Date();
  tbody.innerHTML = filtered.map(payment => {
    const isOverdue = payment.status === 'waiting' && new Date(payment.expectedDate) < today;
    const statusClass = payment.status === 'paid' ? 'success' : 
                         payment.status === 'cancelled' ? 'danger' : 
                         isOverdue ? 'warning' : 'info';
    
    return `
      <tr class="${isOverdue ? 'overdue-row' : ''}">
        <td><strong>${payment.invoiceNumber}</strong></td>
        <td>
          <div>${payment.customerName || 'Walk-in Customer'}</div>
          <small class="text-muted">${payment.customerPhone || ''}</small>
        </td>
        <td>
          ${formatDate(payment.expectedDate)}
          ${isOverdue ? '<span class="badge badge-warning">Overdue</span>' : ''}
        </td>
        <td><strong>${formatCurrency(payment.amount)}</strong></td>
        <td>${payment.salesmanName}</td>
        <td><span class="badge badge-${statusClass}">${payment.status}</span></td>
        <td>
          ${payment.status === 'waiting' ? `
            <div class="action-buttons">
              <button class="btn btn-sm btn-success" onclick="markAsPaid('${payment.id}')">
                <i class="icon-check"></i> Paid
              </button>
              <button class="btn btn-sm btn-danger" onclick="cancelPayment('${payment.id}')">
                <i class="icon-x"></i>
              </button>
            </div>
          ` : '-'}
        </td>
      </tr>
    `;
  }).join('');
}

// Update Statistics
function updateStats() {
  const waiting = pendingPayments.filter(p => p.status === 'waiting');
  const today = new Date();
  const overdue = waiting.filter(p => new Date(p.expectedDate) < today);
  const totalPending = waiting.reduce((sum, p) => sum + p.amount, 0);

  document.getElementById('total-pending').textContent = formatCurrency(totalPending);
  document.getElementById('waiting-count').textContent = waiting.length;
  document.getElementById('overdue-count').textContent = overdue.length;
}

// Mark Payment as Paid
function markAsPaid(paymentId) {
  openModal(
    'Mark as Paid',
    'Are you sure this payment has been received? This will update the sale status to completed.',
    async () => {
      const payment = pendingPayments.find(p => p.id === paymentId);
      if (payment) {
        payment.status = 'paid';
        payment.paidDate = new Date().toISOString();
        
        // Update inventory in Firebase (example)
        await updateInventoryOnPayment(payment, 'paid');
        
        savePendingPayments();
        renderPendingPayments();
        updateStats();
        showToast('Payment marked as paid', 'success');
      }
      closeModal();
    }
  );
}

// Cancel Payment
function cancelPayment(paymentId) {
  openModal(
    'Cancel Payment',
    'Are you sure you want to cancel this pending payment? This will return the items to inventory.',
    async () => {
      const payment = pendingPayments.find(p => p.id === paymentId);
      if (payment) {
        payment.status = 'cancelled';
        payment.cancelledDate = new Date().toISOString();
        
        // Update inventory in Firebase (example)
        await updateInventoryOnPayment(payment, 'cancelled');
        
        savePendingPayments();
        renderPendingPayments();
        updateStats();
        showToast('Payment cancelled', 'success');
      }
      closeModal();
    }
  );
}

// Update Inventory when payment status changes
async function updateInventoryOnPayment(payment, newStatus) {
  // This would be replaced with actual Firebase Firestore calls
  // Example structure:
  /*
  const inventoryRef = db.collection('inventory');
  const saleItems = await db.collection('sales').doc(payment.saleId).collection('items').get();
  
  saleItems.forEach(async (item) => {
    const inventoryDoc = await inventoryRef.doc(item.productId).get();
    const currentQty = inventoryDoc.data();
    
    if (newStatus === 'paid') {
      await inventoryRef.doc(item.productId).update({
        quantityPending: firebase.firestore.FieldValue.increment(-item.quantity),
        quantitySold: firebase.firestore.FieldValue.increment(item.quantity)
      });
    } else if (newStatus === 'cancelled') {
      await inventoryRef.doc(item.productId).update({
        quantityPending: firebase.firestore.FieldValue.increment(-item.quantity),
        quantityAvailable: firebase.firestore.FieldValue.increment(item.quantity)
      });
    }
  });
  */
  console.log(`Inventory updated for payment ${payment.id}: ${newStatus}`);
}

// Modal Functions
function openModal(title, message, onConfirm) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  document.getElementById('confirm-modal').classList.add('active');
  
  document.getElementById('modal-confirm').onclick = onConfirm;
}

function closeModal() {
  document.getElementById('confirm-modal').classList.remove('active');
}

// Toast Notification
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Utility Functions
function formatCurrency(amount) {
  return 'ETB ' + (amount || 0).toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
}

// Make functions available globally
window.markAsPaid = markAsPaid;
window.cancelPayment = cancelPayment;
window.closeModal = closeModal;