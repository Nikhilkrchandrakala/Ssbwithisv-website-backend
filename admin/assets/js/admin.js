
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

      // ✅ Role-based redirect
      if (result.role === "admin" || result.role === "owner") {
        window.location.href = "./admin/dashboard.html";
      } else if (result.role === "franchise") {
        window.location.href = "./admin/FranchiesDashboard.html";
      } else {
        window.location.href = "/";
      }

    } else {
      errorMessage.textContent = result.error || 'An error occurred';
    }
  } catch (error) {
    errorMessage.textContent = 'Failed to login. Please try again.';
  }
});


