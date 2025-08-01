document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS animations
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Initialize date pickers
    flatpickr("#startDate", {
        dateFormat: "Y-m-d",
        defaultDate: new Date()
    });

    flatpickr("#endDate", {
        dateFormat: "Y-m-d",
        defaultDate: new Date()
    });

    flatpickr("#pldate", {
        dateFormat: "Y-m-d",
        defaultDate: new Date(),
        mode: "range"
    });

    // Mobile menu toggle
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileSidebar = document.getElementById('mobile-sidebar');
    
    if (mobileMenuButton && mobileSidebar) {
        mobileMenuButton.addEventListener('click', function() {
            mobileSidebar.classList.toggle('hidden');
        });
    }

    // User menu toggle
    const userMenuButton = document.getElementById('user-menu-button');
    const userMenu = document.getElementById('user-menu');
    
    if (userMenuButton && userMenu) {
        userMenuButton.addEventListener('click', function() {
            userMenu.classList.toggle('hidden');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!mobileSidebar.contains(event.target) && event.target !== mobileMenuButton) {
            mobileSidebar.classList.add('hidden');
        }
        
        if (userMenu && !userMenu.contains(event.target)) {
            if (event.target !== userMenuButton && !userMenuButton.contains(event.target)) {
                userMenu.classList.add('hidden');
            }
        }
    });

    // Initialize Sales Trend Chart
    const salesTrendCtx = document.getElementById('salesTrendChart');
    if (salesTrendCtx) {
        new Chart(salesTrendCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Daily Sales (₦)',
                    data: [45000, 52000, 48000, 61000, 75000, 68000, 55000],
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
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        grid: {
                            drawBorder: false
                        },
                        ticks: {
                            callback: function(value) {
                                return '₦' + value.toLocaleString();
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Initialize Top Items Chart
    const topItemsCtx = document.getElementById('topItemsChart');
    if (topItemsCtx) {
        new Chart(topItemsCtx, {
            type: 'bar',
            data: {
                labels: ['Acyclovir', 'Esomeprazole', 'Gastracid', 'Alugel', 'BRAlPORIN+'],
                datasets: [{
                    label: 'Quantity Sold',
                    data: [45, 38, 32, 28, 25],
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
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            drawBorder: false
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Generate report based on filters
    window.generateReport = function() {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        // In a real app, you would fetch data based on these filters
        console.log('Generating report:', { reportType, startDate, endDate });
        
        // Show loading state and then update the charts and tables
        // This is where you would call your backend API
    };

    // Show alert message
    function showAlert(message, type) {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Create alert element
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

        // Add to DOM
        document.body.appendChild(alert);

        // Auto remove after 5 seconds
        setTimeout(() => {
            alert.classList.add('opacity-0', 'translate-x-8');
            setTimeout(() => alert.remove(), 300);
        }, 5000);
    }
});