document.addEventListener('DOMContentLoaded', () => {
  const button = document.getElementById('logoutBtn');
  if (button) {
    button.addEventListener('click', () => {
      localStorage.removeItem('storeflow_logged_in');
      window.location.href = 'login.html';
    });
  }
});
