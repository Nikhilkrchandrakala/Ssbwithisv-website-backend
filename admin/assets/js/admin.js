
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${config.backendBaseUrl}/api/AdminLogin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok) {
      alert('Login successful!');

      // ✅ Save token
      localStorage.setItem('token', result.token);

      // ✅ Save role (important)
      localStorage.setItem('role', result.role);

      // ✅ Role-based redirect to Hostinger VPS
      if (result.role === "admin") {
        window.location.href = `${config.backendBaseUrl}/admin/dashboard.html`;
      } else if (result.role === "franchise") {
        window.location.href = `${config.backendBaseUrl}/admin/FranchiesDashboard.html`;
      } else {
        window.location.href = `${config.backendBaseUrl}/`;
      }

    } else {
      errorMessage.textContent = result.error || 'An error occurred';
    }
  } catch (error) {
    errorMessage.textContent = 'Failed to login. Please try again.';
  }
});


