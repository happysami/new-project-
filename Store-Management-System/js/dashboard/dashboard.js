document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('dashboardView');
  if (!container) return;
  container.innerHTML = `
    <div class="cards-grid">
      <article class="card">Today Sales<br /><strong>ETB 42,000</strong></article>
      <article class="card">Today Profit<br /><strong>ETB 13,500</strong></article>
      <article class="card">Inventory Value<br /><strong>ETB 185,000</strong></article>
      <article class="card">Pending Payments<br /><strong>ETB 17,400</strong></article>
    </div>
    <div class="panel">
      <h3>Sales Overview</h3>
      <p>Revenue and profit trend updates automatically from sales and inventory activity.</p>
    </div>
  `;
});
