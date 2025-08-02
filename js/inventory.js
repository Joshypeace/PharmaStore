// inventory.js
let inventoryTable;


document.addEventListener('DOMContentLoaded', function () {
    AOS.init({ duration: 800, easing: 'ease-in-out', once: true });

        inventoryTable = $('#inventoryTable').DataTable({
        responsive: true,
        columnDefs: [
            { responsivePriority: 1, targets: 2 },
            { responsivePriority: 2, targets: 6 },
            { responsivePriority: 3, targets: 4 },
            { responsivePriority: 4, targets: 5 }
        ],
        language: {
            emptyTable: "No inventory data available. Import your data to get started."
        }

    
    });
    
    document.getElementById('importFile').addEventListener('change', function (e) {
        document.getElementById('fileName').textContent = e.target.files[0]?.name || 'No file selected';
    });
    
    document.getElementById('importForm').addEventListener('submit', handleImportSubmit);
    document.getElementById('itemForm').addEventListener('submit', handleItemSubmit);
    checkInventoryExists();

});


async function checkInventoryExists() {
    try {
        // const token = getToken();

        const response = await fetch('http://localhost:5000/api/inventory/exists');

        if (response.status === 401){
            showAlert('Session expired. Please login again, ', 'error');
            logout();
            return;
        }

        if (!response.ok) throw new Error('Failed to check inventory status');

        const { data } = await response.json();
        data.hasInventory ? loadInventoryData() : showEmptyState();
    } catch (error) {
        console.error('Error:', error);
        showEmptyState();
    }
}


function logout(){
    localStorage.removeItem('pharmaToken');
    sessionStorage.removeItem('pharmaToken');
    window.location.href = 'html/index.html'
}

async function loadInventoryData() {
    try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/inventory', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load inventory data');

        const { data } = await response.json();
        data.length > 0 ? (hideEmptyState(), populateInventoryTable(data)) : showEmptyState();
    } catch (error) {
        console.error('Error:', error);
        showEmptyState();
        showAlert('Failed to load inventory data. Please try again or import your data.', 'error');
    }
}

function showEmptyState() {
    document.getElementById('inventoryTable_wrapper').style.display = 'none';
    let emptyState = document.getElementById('emptyState');

    if (!emptyState) {
        emptyState = document.createElement('div');
        emptyState.id = 'emptyState';
        emptyState.className = 'text-center py-12';
        emptyState.innerHTML = `
            <i class="fas fa-box-open text-4xl text-gray-400 mb-4"></i>
            <h3 class="text-lg font-medium text-gray-900">No inventory items found</h3>
            <p class="text-gray-500 mt-1">Get started by importing your inventory or adding items manually</p>
            <div class="mt-6">
                <button onclick="openImportModal()" class="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                    <i class="fas fa-file-import mr-2"></i> Import Excel
                </button>
                <button onclick="openAddItemModal()" class="ml-3 inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <i class="fas fa-plus mr-2"></i> Add Item
                </button>
            </div>`;
        document.querySelector('main').appendChild(emptyState);
    } else {
        emptyState.style.display = 'block';
    }
}

function hideEmptyState() {
    document.getElementById('inventoryTable_wrapper').style.display = 'block';
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.style.display = 'none';
}

function populateInventoryTable(items) {
   inventoryTable.clear();

    items.forEach(item => {
        table.row.add([
            item.category,
            item.type,
            item.name,
            `MWK${item.price.toLocaleString()}`,
            item.stock,
            `<span class="px-2 py-1 text-xs font-semibold rounded-full ${
                item.status === 'Out of Stock' ? 'bg-red-100 text-red-800' :
                item.status === 'Low Stock' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
            }">${item.status}</span>`,
            `<button class="text-primary-600 hover:text-primary-900 mr-3" onclick="openEditModal(${item.id})">
                <i class="fas fa-edit"></i>
            </button>
            <button class="text-red-600 hover:text-red-900" onclick="deleteItem(${item.id})">
                <i class="fas fa-trash-alt"></i>
            </button>`
        ]);
    });

    inventoryTable.draw();
}

async function handleImportSubmit(e) {
    e.preventDefault();
    const fileInput = document.getElementById('importFile');
    if (!fileInput.files[0]) return showAlert('Please select a file to import', 'error');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const token = getToken();
        const response = await fetch('http://localhost:5000/api/inventory/import', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (!response.ok) throw new Error('Import failed');

        const result = await response.json();
        showAlert(`Successfully imported ${result.data.imported.length} items`, 'success');
        closeImportModal();
        loadInventoryData();
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'error');
    }
}

async function handleItemSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const isEdit = form.dataset.edit === 'true';
    const itemId = form.dataset.itemId;

    const itemData = {
        category: form.category.value,
        type: form.itemType.value,
        name: form.itemName.value,
        variant_name: form.variantName.value || null,
        price: parseFloat(form.price.value),
        stock: parseInt(form.stock.value),
        expiry_date: form.expiryDate.value || null
    };

    try {
        const token = getToken();
        const url = isEdit ? `http://localhost:5000/api/inventory/${itemId}` : 'http://localhost:5000/api/inventory';
        const method = isEdit ? 'PATCH' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) throw new Error(isEdit ? 'Failed to update item' : 'Failed to create item');

        showAlert(`Item ${isEdit ? 'updated' : 'added'} successfully`, 'success');
        closeItemModal();
        loadInventoryData();
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'error');
    }
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/inventory/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to delete item');

        showAlert('Item deleted successfully', 'success');
        loadInventoryData();
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'error');
    }
}

function openImportModal() {
    document.getElementById('importModal').classList.remove('hidden');
    document.getElementById('importFile').value = '';
    document.getElementById('fileName').textContent = 'No file selected';
}

function closeImportModal() {
    document.getElementById('importModal').classList.add('hidden');
}

function openAddItemModal() {
    const form = document.getElementById('itemForm');
    form.reset();
    form.dataset.edit = 'false';
    form.dataset.itemId = '';
    document.getElementById('modalTitle').textContent = 'Add New Inventory Item';
    document.getElementById('itemModal').classList.remove('hidden');
}

async function openEditModal(id) {
    try {
        const token = getToken();
        const response = await fetch(`http://localhost:5000/api/inventory/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load item data');

        const { data } = await response.json();
        const form = document.getElementById('itemForm');

        form.category.value = data.category;
        form.itemType.value = data.type;
        form.itemName.value = data.name;
        form.variantName.value = data.variant_name || '';
        form.price.value = data.price;
        form.stock.value = data.stock;
        form.expiryDate.value = data.expiry_date || '';

        form.dataset.edit = 'true';
        form.dataset.itemId = id;
        document.getElementById('modalTitle').textContent = 'Edit Inventory Item';
        document.getElementById('itemModal').classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        showAlert(error.message, 'error');
    }
}

function closeItemModal() {
    document.getElementById('itemModal').classList.add('hidden');
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `fixed top-4 right-4 px-6 py-4 rounded-lg shadow-lg text-white font-medium z-50 ${
        type === 'error' ? 'bg-red-500' : 'bg-green-500'
    }`;
    alert.innerHTML = `
        <div class="flex items-center">
            <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : 'fa-check-circle'} mr-2"></i>
            <span>${message}</span>
        </div>`;

    document.body.appendChild(alert);

    setTimeout(() => alert.remove(), 5000);
}

function getToken() {
    const token = localStorage.getItem('pharmaToken') || sessionStorage.getItem('pharmaToken');
   if(!token){
     showAlert('Please login to access this feature', 'errpr');
     window.location.href = 'html/index.html';
     throw new Error('No token available');

   }

   return token;
}
