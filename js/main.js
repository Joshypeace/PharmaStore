document.addEventListener('DOMContentLoaded', function () {
    // ✅ Initialize AOS animations
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // ✅ Login form handler (only if on index.html)
  const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me').checked;

        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Store JWT token
                if (rememberMe) {
                    localStorage.setItem('pharmaToken', data.token);
                } else {
                    sessionStorage.setItem('pharmaToken', data.token);
                }

                // Optional: Store login flag
                localStorage.setItem('loggedIn', 'true');

                // Redirect to dashboard
                window.location.href = 'dashboard.html';
            } else {
                showAlert(data.message || 'Login failed', 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            showAlert('An error occurred during login', 'error');
        }
    });
}

    //  Run only on index.html to avoid redirect flicker
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/' || window.location.href.endsWith('127.0.0.1:5500/')) {
        checkAuthStatus();
    }

    // Function to check if user is logged in
    function checkAuthStatus() {
        fetch('http://localhost:5000/api/auth/me', {
            method: 'GET',
            credentials: 'include'
        })
        .then(res => {
            if (res.ok) {
                window.location.href = 'dashboard.html';
            }
        })
        .catch(err => {
            console.warn('Auth check failed:', err);
        });
    }

    // ✅ Reusable alert
    function showAlert(message, type) {
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) existingAlert.remove();

        const alert = document.createElement('div');
        alert.className = `custom-alert fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 transform transition-all duration-300 ${
            type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`;
        alert.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(alert);
        setTimeout(() => {
            alert.classList.add('opacity-0', 'translate-x-8');
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }

    // ✅ Logout (you can use this from any page)
    window.logout = function () {
        fetch('http://localhost:5000/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        }).finally(() => {
            localStorage.removeItem('loggedIn');
            sessionStorage.removeItem('loggedIn');
            window.location.href = 'index.html';
        });
    }

    // Navigation page transition
    window.navigateTo = function (page) {
        const pageContent = document.querySelector('.page-content');
        if (pageContent) {
            pageContent.classList.add('page-leave-active');
            setTimeout(() => {
                window.location.href = page;
            }, 300);
        } else {
            window.location.href = page;
        }
    }
});

// Smooth anchor scroll for landing page
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            window.scrollTo({
                top: targetElement.offsetTop - 80,
                behavior: 'smooth'
            });
        }
    });
});

// ✅ AOS initialization on landing sections
if (document.querySelector('section')) {
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
        offset: 100
    });
}
