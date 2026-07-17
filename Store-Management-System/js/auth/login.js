document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (email === 'admin@storeflow.com' && password === 'admin123') {
      localStorage.setItem('storeflow_logged_in', 'true');
      window.location.href = 'dashboard.html';
    } else {
      alert('Invalid credentials');
    }
  });
});
