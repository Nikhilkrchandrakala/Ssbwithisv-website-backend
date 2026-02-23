
const loginForm = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch(`${config.backendBaseUrl}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (response.ok) {
      alert('Login successful!');
      localStorage.setItem('token', result.token); // Store token in local storage
      window.location.href = './admin/dashboard.html'; // Redirect to admin dashboard (adjust the route)
    } else {
      errorMessage.textContent = result.error || 'An error occurred';
    }
  } catch (error) {
    errorMessage.textContent = 'Failed to login. Please try again.';
  }
});