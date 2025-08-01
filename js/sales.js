document.addEventListener('DOMContentLoaded', function() {
    // Initialize AOS animations
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Initialize date picker
    flatpickr("#saleDate", {
        enableTime: true,
        dateFormat: "Y-m-d H:i",
        defaultDate: new Date(),
        time_24hr: true
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

    // Initialize current sale data
    let currentSale = {
        items: [],
        customer: '',
        date: new Date(),
        discount: 0
    };

    // Update sale totals
    function updateSaleTotals() {
        let subtotal = 0;
        currentSale.items.forEach(item => {
            subtotal += item.price * item.quantity;
        });

        const discount = parseFloat(document.getElementById('discount').value) || 0;
        currentSale.discount = discount;
        
        const total = subtotal - discount;

        // Update the table footer
        document.querySelector('#saleItems + tfoot tr:first-child td:last-child').textContent = `₦${subtotal.toFixed(2)}`;
        document.querySelector('#saleItems + tfoot tr:last-child td:last-child').textContent = `₦${total.toFixed(2)}`;
    }

    // Add item to current sale
    function addItemToSale() {
        const itemName = document.getElementById('searchItem').value;
        const price = parseFloat(document.getElementById('searchItem').dataset.price) || 0;
        const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;

        if (!itemName || price <= 0) {
            showAlert('Please select a valid item', 'error');
            return;
        }

        // Check if item already exists in sale
        const existingItem = currentSale.items.find(item => item.name === itemName);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            currentSale.items.push({
                name: itemName,
                price: price,
                quantity: quantity
            });
        }

        renderSaleItems();
        closeAddItemModal();
        updateSaleTotals();
    }

    // Render sale items in table
    function renderSaleItems() {
        const saleItemsContainer = document.getElementById('saleItems');
        
        if (currentSale.items.length === 0) {
            saleItemsContainer.innerHTML = `
                <tr>
                    <td colspan="5" class="px-6 py-4 text-center text-sm text-gray-500" id="emptySaleMessage">
                        No items added to this sale yet. Click "Add Item" to start.
                    </td>
                </tr>
            `;
            return;
        }

        saleItemsContainer.innerHTML = '';
        
        currentSale.items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₦${item.price.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <input type="number" min="1" value="${item.quantity}" 
                           class="w-20 px-2 py-1 border border-gray-300 rounded text-sm" 
                           onchange="updateItemQuantity(${index}, this.value)">
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₦${(item.price * item.quantity).toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button class="text-red-600 hover:text-red-900" onclick="removeItemFromSale(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            `;
            saleItemsContainer.appendChild(row);
        });
    }

    // Clear current sale
    function clearSale() {
        if (currentSale.items.length === 0) return;
        
        if (confirm('Are you sure you want to clear the current sale?')) {
            currentSale.items = [];
            document.getElementById('customer').value = '';
            document.getElementById('discount').value = '0';
            renderSaleItems();
            updateSaleTotals();
        }
    }

    // Complete sale
    function completeSale() {
        if (currentSale.items.length === 0) {
            showAlert('Please add items to the sale before completing', 'error');
            return;
        }

        // In a real app, you would send this data to your backend
        const saleData = {
            ...currentSale,
            customer: document.getElementById('customer').value || 'Walk-in Customer',
            date: document.getElementById('saleDate').value || new Date().toISOString(),
            total: calculateSaleTotal()
        };

        console.log('Sale completed:', saleData);
        showAlert('Sale completed successfully!', 'success');
        
        // Reset for new sale
        currentSale.items = [];
        document.getElementById('discount').value = '0';
        renderSaleItems();
        updateSaleTotals();
        
        // In a real app, you would update the recent sales list from the backend response
    }

    // Calculate sale total
    function calculateSaleTotal() {
        let subtotal = 0;
        currentSale.items.forEach(item => {
            subtotal += item.price * item.quantity;
        });
        return subtotal - (parseFloat(document.getElementById('discount').value) || 0);
    }

    // View sale details
    function viewSaleDetails(saleId) {
        // In a real app, you would fetch these details from your backend
        const sampleSale = {
            id: saleId,
            date: saleId === 'PS-1001' ? 'Today, 10:45 AM' : 
                 saleId === 'PS-1000' ? 'Today, 9:30 AM' : 'Today, 8:15 AM',
            customer: saleId === 'PS-1001' ? 'Walk-in Customer' : 
                     saleId === 'PS-1000' ? 'John Smith' : 'Walk-in Customer',
            staff: 'John Doe',
            payment: 'Cash',
            items: saleId === 'PS-1001' ? [
                { name: 'Acyclovir CrDAVIR', price: 4200, quantity: 2 },
                { name: 'Esomeprazole', price: 6600, quantity: 1 }
            ] : saleId === 'PS-1000' ? [
                { name: 'Gastracid', price: 8000, quantity: 2 },
                { name: 'BRAlPORIN+', price: 3000, quantity: 3 }
            ] : [
                { name: 'Alugel 100m', price: 4000, quantity: 1 },
                { name: 'Antagit DS', price: 4500, quantity: 1 }
            ],
            discount: 0
        };

        // Populate modal
        document.getElementById('saleDetailsId').textContent = `#${sampleSale.id}`;
        document.getElementById('saleDetailsDate').textContent = sampleSale.date;
        document.getElementById('saleDetailsCustomer').textContent = sampleSale.customer;
        document.getElementById('saleDetailsStaff').textContent = sampleSale.staff;
        document.getElementById('saleDetailsPayment').textContent = sampleSale.payment;

        const itemsContainer = document.getElementById('saleDetailsItems');
        itemsContainer.innerHTML = '';

        let subtotal = 0;
        sampleSale.items.forEach(item => {
            const row = document.createElement('tr');
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${item.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₦${item.price.toFixed(2)}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${item.quantity}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₦${itemTotal.toFixed(2)}</td>
            `;
            itemsContainer.appendChild(row);
        });

        const total = subtotal - sampleSale.discount;

        // Update totals in modal
        document.querySelector('#saleDetailsItems + tfoot tr:first-child td:last-child').textContent = `₦${subtotal.toFixed(2)}`;
        document.querySelector('#saleDetailsItems + tfoot tr:nth-child(2) td:last-child').textContent = `₦${sampleSale.discount.toFixed(2)}`;
        document.querySelector('#saleDetailsItems + tfoot tr:last-child td:last-child').textContent = `₦${total.toFixed(2)}`;

        // Show modal
        document.getElementById('saleDetailsModal').classList.remove('hidden');
    }

    // Print receipt
    function printReceipt() {
        if (currentSale.items.length === 0) {
            showAlert('No items in current sale to print', 'error');
            return;
        }

        // Prepare receipt data
        const receipt = document.getElementById('receiptTemplate').cloneNode(true);
        receipt.id = 'printableReceipt';
        receipt.classList.remove('hidden');

        // Set receipt details
        receipt.querySelector('#receiptId').textContent = `PS-${Math.floor(1000 + Math.random() * 9000)}`;
        receipt.querySelector('#receiptDate').textContent = new Date().toLocaleString();
        receipt.querySelector('#receiptStaff').textContent = 'John Doe';

        // Add items to receipt
        const itemsContainer = receipt.querySelector('#receiptItems');
        itemsContainer.innerHTML = '';

        let subtotal = 0;
        currentSale.items.forEach(item => {
            const itemTotal = item.price * item.quantity;
            subtotal += itemTotal;
            
            const row = document.createElement('tr');
            row.className = 'border-b border-gray-200';
            row.innerHTML = `
                <td class="py-2 text-sm">
                    ${item.name} (${item.quantity} @ ₦${item.price.toFixed(2)})
                </td>
                <td class="py-2 text-right text-sm">₦${itemTotal.toFixed(2)}</td>
            `;
            itemsContainer.appendChild(row);
        });

        const discount = parseFloat(document.getElementById('discount').value) || 0;
        const total = subtotal - discount;

        // Update receipt totals
        receipt.querySelector('#receiptSubtotal').textContent = `₦${subtotal.toFixed(2)}`;
        receipt.querySelector('#receiptDiscount').textContent = `₦${discount.toFixed(2)}`;
        receipt.querySelector('#receiptTotal').textContent = `₦${total.toFixed(2)}`;

        // Print receipt
        document.body.appendChild(receipt);
        window.print();
        document.body.removeChild(receipt);
    }

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

// Global functions for HTML event handlers
function openNewSaleModal() {
    document.getElementById('addItemModal').classList.remove('hidden');
}

function closeAddItemModal() {
    document.getElementById('addItemModal').classList.add('hidden');
}

function closeSaleDetailsModal() {
    document.getElementById('saleDetailsModal').classList.add('hidden');
}

function selectItem(name, price) {
    document.getElementById('searchItem').value = name;
    document.getElementById('searchItem').dataset.price = price;
}

function updateItemQuantity(index, quantity) {
    if (window.currentSale && window.currentSale.items[index]) {
        const newQuantity = parseInt(quantity) || 1;
        window.currentSale.items[index].quantity = newQuantity;
        window.renderSaleItems();
        window.updateSaleTotals();
    }
}

function removeItemFromSale(index) {
    if (window.currentSale && window.currentSale.items[index]) {
        window.currentSale.items.splice(index, 1);
        window.renderSaleItems();
        window.updateSaleTotals();
    }
}

function printReceiptFromModal() {
    // This would use the same printReceipt function but for the modal's sale
    window.printReceipt();
    window.closeSaleDetailsModal();
}

function reprintReceipt(saleId) {
    // In a real app, you would fetch the sale data and print it
    alert(`Reprinting receipt for sale ${saleId}`);
}