 document.addEventListener('DOMContentLoaded', function() {
            // Initialize AOS animations
            AOS.init({
                duration: 800,
                easing: 'ease-in-out',
                once: true
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

            // Settings tabs functionality
            const tabs = {
                'general-tab': 'general-settings',
                'notifications-tab': 'notifications-settings',
                'backup-tab': 'backup-settings'
            };

            // Set initial active tab
            let currentTab = 'general-tab';
            document.getElementById(currentTab).classList.add('border-primary-500', 'text-primary-600');
            document.getElementById(currentTab).classList.remove('border-transparent', 'text-gray-500');
            document.getElementById(tabs[currentTab]).classList.remove('hidden');

            // Add click handlers for all tabs
            Object.keys(tabs).forEach(tabId => {
                document.getElementById(tabId).addEventListener('click', function() {
                    // Hide current tab content
                    document.getElementById(tabs[currentTab]).classList.add('hidden');
                    document.getElementById(currentTab).classList.remove('border-primary-500', 'text-primary-600');
                    document.getElementById(currentTab).classList.add('border-transparent', 'text-gray-500');

                    // Show new tab content
                    currentTab = tabId;
                    document.getElementById(tabs[currentTab]).classList.remove('hidden');
                    document.getElementById(currentTab).classList.add('border-primary-500', 'text-primary-600');
                    document.getElementById(currentTab).classList.remove('border-transparent', 'text-gray-500');
                });
            });

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

            // Form submission handlers for store settings
            const storeInfoForm = document.querySelector('#general-settings form');
            if (storeInfoForm) {
                storeInfoForm.addEventListener('submit', function(e) {
                    e.preventDefault();
                    
                    // Here you would typically send the data to your backend
                    console.log('Saving store information');
                    
                    // Show success message
                    showAlert('Store information saved successfully!', 'success');
                });
            }

            // Add similar form handlers for other forms as needed
        });