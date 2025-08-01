document.addEventListener('DOMContentLoaded', function () {
    // Initialize AOS animations
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true,
    });

    // Check authentication and load user data
    checkAuthAndLoadData();

    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    const closeSidebarButton = mobileSidebar?.querySelector('button');

    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');

    // Toggle mobile sidebar
    if (mobileMenuButton && mobileSidebar) {
        mobileMenuButton.addEventListener('click', function (event) {
            event.stopPropagation();
            mobileSidebar.classList.toggle('hidden');
        });
    }

    // Close sidebar with X button
    if (closeSidebarButton && mobileSidebar) {
        closeSidebarButton.addEventListener('click', function (event) {
            event.stopPropagation();
            mobileSidebar.classList.add('hidden');
        });
    }

    // Toggle user menu
    if (userMenuButton && userMenu) {
        userMenuButton.addEventListener('click', function (event) {
            event.stopPropagation();
            userMenu.classList.toggle('hidden');
        });
    }

    // Global click to close menus if clicking outside
    document.addEventListener('click', function (event) {
        if (
            mobileSidebar &&
            !mobileSidebar.contains(event.target) &&
            event.target !== mobileMenuButton &&
            !mobileMenuButton.contains(event.target)
        ) {
            mobileSidebar.classList.add('hidden');
        }

        if (
            userMenu &&
            !userMenu.contains(event.target) &&
            event.target !== userMenuButton &&
            !userMenuButton.contains(event.target)
        ) {
            userMenu.classList.add('hidden');
        }
    });

    // Sign out
    const signOutLink = document.querySelector('#sign-out a[href="index.html"]');
    if (signOutLink) {
        signOutLink.addEventListener('click', function (e) {
            e.preventDefault();
            localStorage.removeItem('pharmaToken');
            sessionStorage.removeItem('pharmaToken');
            window.location.href = 'html/index.html';
        });
    }
});

async function checkAuthAndLoadData() {
    try {
        const token = localStorage.getItem('jwt') || sessionStorage.getItem('jwt');
        
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Check if user is authenticated using JWT
        const response = await fetch('http://localhost:5000/api/auth/me', {
            method:'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('Authentication failed');
        }

        const userData = await response.json();
        updateUserProfile(userData.data.user);

        // Load dashboard stats with JWT
        const statsResponse = await fetch('http://localhost:5000/api/auth/dashboard-stats', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!statsResponse.ok) {
            throw new Error('Failed to load dashboard data');
        }

        const statsData = await statsResponse.json();
        updateDashboardStats(statsData.data);
        renderCharts(statsData.data);

    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'error');
        window.location.href = 'index.html';
    }
}

function updateUserProfile(user) {
    const sidebarProfile = document.querySelector('.p-4.border-t.border-gray-200 .ml-3');
    if (sidebarProfile) {
        sidebarProfile.querySelector('p:first-child').textContent = user.full_name;
        sidebarProfile.querySelector('p:last-child').textContent = user.role;
    }

    const mobileSidebarProfile = document.querySelector('#mobile-sidebar .p-4.border-t.border-gray-200 .ml-3');
    if (mobileSidebarProfile) {
        mobileSidebarProfile.querySelector('p:first-child').textContent = user.full_name;
        mobileSidebarProfile.querySelector('p:last-child').textContent = user.role;
    }

    const headerProfile = document.querySelector('header .flex.items-center.space-x-2 span');
    if (headerProfile) {
        headerProfile.textContent = user.full_name;
    }
}

function updateDashboardStats(data) {
    const salesChange = data.yesterdaySales > 0
        ? ((data.todaySales - data.yesterdaySales) / data.yesterdaySales * 100).toFixed(1)
        : 100;

    document.querySelector('[data-aos="fade-up"] .text-2xl').textContent = `₦${data.todaySales.toLocaleString()}`;
    document.querySelector('[data-aos="fade-up"] .text-xs').innerHTML =
        `<i class="fas fa-arrow-up mr-1"></i> ${salesChange}% from yesterday`;

    document.querySelector('[data-aos-delay="100"] .text-2xl').textContent = data.totalItems.toLocaleString();
    document.querySelector('[data-aos-delay="100"] .text-xs').innerHTML =
        `<i class="fas fa-exclamation-circle mr-1"></i> ${data.lowStock} low in stock`;

    document.querySelector('[data-aos-delay="200"] .text-2xl').textContent = data.outOfStock;
    document.querySelector('[data-aos-delay="300"] .text-2xl').textContent = data.expiringSoon;

    const recentSalesTable = document.querySelector('.bg-white.rounded-xl.shadow-sm.overflow-hidden table tbody');
    if (recentSalesTable) {
        recentSalesTable.innerHTML = data.recentSales.map(sale => `
            <tr>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${sale.item}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${sale.quantity}</td>
                <td class="px-4 py-3 text-sm text-gray-500">₦${sale.amount.toLocaleString()}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${sale.time}</td>
            </tr>
        `).join('');
    }

    const lowStockTable = document.querySelector('[data-aos-delay="100"] table tbody');
    if (lowStockTable) {
        lowStockTable.innerHTML = data.lowStockItems.map(item => `
            <tr>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">${item.item}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${item.category}</td>
                <td class="px-4 py-3 text-sm text-gray-500">${item.stock}</td>
                <td class="px-4 py-3">
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'Out of Stock' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }">${item.status}</span>
                </td>
            </tr>
        `).join('');
    }
}

function renderCharts(data) {
    const salesCtx = document.getElementById('salesChart');
    if (salesCtx) {
        const salesMap = {};
        data.weeklySales.forEach(day => salesMap[day.day] = day.total);

        const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const chartData = daysOrder.map(day => ({
            day: day.substring(0, 3),
            sales: salesMap[day] || 0
        }));

        new Chart(salesCtx, {
            type: 'line',
            data: {
                labels: chartData.map(item => item.day),
                datasets: [{
                    label: 'Daily Sales (₦)',
                    data: chartData.map(item => item.sales),
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderColor: 'rgba(14, 165, 233, 1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: { drawBorder: false },
                        ticks: {
                            callback: value => '₦' + value.toLocaleString()
                        }
                    },
                    x: { grid: { display: false } }
                }
            }
        });
    }

    const inventoryCtx = document.getElementById('inventoryChart');
    if (inventoryCtx && data.inventoryByCategory.length > 0) {
        new Chart(inventoryCtx, {
            type: 'doughnut',
            data: {
                labels: data.inventoryByCategory.map(item => item.category),
                datasets: [{
                    data: data.inventoryByCategory.map(item => item.count),
                    backgroundColor: [
                        'rgba(14, 165, 233, 0.8)',
                        'rgba(20, 184, 166, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(244, 63, 94, 0.8)',
                        'rgba(245, 158, 11, 0.8)'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right' } },
                cutout: '70%'
            }
        });
    }
}

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
