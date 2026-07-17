document.addEventListener('DOMContentLoaded', () => {
  const isLoggedIn = localStorage.getItem('storeflow_logged_in') === 'true';
  if (window.location.pathname.includes('login.html')) {
    if (isLoggedIn) window.location.href = 'dashboard.html';
    return;
  }
  if (!isLoggedIn && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
  }
});
