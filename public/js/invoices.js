// Invoice management functionality with LocalStorage
let invoices = [];
let customers = [];
let products = [];
let currentSortOrder = {
    dueDate: 'desc'
};

// Payment types
const paymentTypes = [
    'Cash', 'Check', 'Credit Card', 'Debit Card', 'Bank Transfer',
    'ACH/Wire', 'PayPal', 'Venmo', 'Zelle', 'Other'
];

// Toggle due date field visibility based on "paid at service" checkbox
function toggleInvoiceDueDateField() {
    const paidCheckbox = document.getElementById('invoicePaidAtService');
    const dueDateContainer = document.getElementById('invoiceDueDateContainer');
    const dueDateInput = document.getElementById('invoiceDueDate');
    
    if (paidCheckbox && paidCheckbox.checked) {
        dueDateContainer.style.display = 'none';
        dueDateInput.removeAttribute('required');
    } else {
        dueDateContainer.style.display = 'block';
        dueDateInput.setAttribute('required', '');
    }
}

// Load data on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Show loading state
    LoadingState.showTableLoading('invoices-tbody', 7);
    
    // Simulate async load with minimum delay for smooth UX
    await LoadingState.simulateAsync(() => {
        loadData();
        updateOverdueInvoices();
    }, 400);
    
    displayInvoices();
    setupFormMonitoring();
    addInvoiceTotalsSection();
});

// Load data from storage
function loadData() {
    invoices = erpStorage.getInvoices();
    customers = erpStorage.getCustomers();
    products = erpStorage.getProducts();
}

// Show create invoice form
function showCreateInvoiceForm() {
    const modal = document.getElementById('create-invoice-form');
    modal.style.display = 'flex';
    populateCustomers();
    populateProducts();
    
    // Clear date field to default blank state
    document.getElementById('invoiceDueDate').value = '';
    
    // Add event listener to Invoice Date to auto-populate Due Date
    const invoiceDateField = document.getElementById('invoiceDate');
    if (invoiceDateField) {
        // Remove existing listener if any
        invoiceDateField.removeEventListener('change', updateDueDateFromInvoiceDate);
        // Add new listener
        invoiceDateField.addEventListener('change', updateDueDateFromInvoiceDate);
    }
    
    // Add click outside to close
    modal.onclick = function(event) {
        if (event.target === modal) {
            hideCreateInvoiceForm();
        }
    };
    
    // Add ESC key to close
    document.addEventListener('keydown', invoiceModalEscapeHandler);
    
    // Ensure totals section exists and is reset
    setTimeout(() => {
        addInvoiceTotalsSection();
        updateCreateInvoiceTotals();
    }, 100);
}

// ESC key handler for invoice modal
function invoiceModalEscapeHandler(event) {
    if (event.key === 'Escape') {
        hideCreateInvoiceForm();
    }
}

// Update Due Date to 30 days after Invoice Date
function updateDueDateFromInvoiceDate() {
    const invoiceDateField = document.getElementById('invoiceDate');
    const dueDateField = document.getElementById('invoiceDueDate');
    
    if (invoiceDateField && dueDateField && invoiceDateField.value) {
        const invoiceDate = new Date(invoiceDateField.value + 'T00:00:00');
        // Add 30 days
        invoiceDate.setDate(invoiceDate.getDate() + 30);
        
        // Format as YYYY-MM-DD for the date input
        const year = invoiceDate.getFullYear();
        const month = String(invoiceDate.getMonth() + 1).padStart(2, '0');
        const day = String(invoiceDate.getDate()).padStart(2, '0');
        
        dueDateField.value = `${year}-${month}-${day}`;
    }
}

// Hide create invoice form
function hideCreateInvoiceForm() {
    const form = document.getElementById('create-invoice-form').querySelector('form');
    
    // Reset edit mode
    if (form) {
        delete form.dataset.editingInvoiceId;
        
        const formTitle = document.querySelector('#create-invoice-form h3');
        if (formTitle) {
            formTitle.textContent = 'Create Invoice';
        }
        
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Create Invoice';
        }
        
        form.reset();
    }
    
    document.getElementById('create-invoice-form').style.display = 'none';
    
    // Remove ESC key listener
    document.removeEventListener('keydown', invoiceModalEscapeHandler);
    
    // Reset to single item
    const itemsContainer = document.getElementById('invoice-items');
    const items = itemsContainer.querySelectorAll('.invoice-item');
    for (let i = 1; i < items.length; i++) {
        items[i].remove();
    }
}

// Populate customers dropdown
function populateCustomers() {
    const select = document.getElementById('invoiceCustomer');
    select.innerHTML = '<option value="">Select a customer...</option>';
    
    customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        select.appendChild(option);
    });
}

// Populate products dropdown
function populateProducts() {
    const selects = document.querySelectorAll('.item-product');
    selects.forEach(select => {
        select.innerHTML = '<option value="">Select product...</option>';
        products.forEach(product => {
            const option = document.createElement('option');
            option.value = product.id;
            option.textContent = `${product.name} - $${product.price}`;
            select.appendChild(option);
        });
    });
}

// Add invoice item
function addInvoiceItem() {
    const itemsContainer = document.getElementById('invoice-items');
    const newItem = document.createElement('div');
    newItem.className = 'invoice-item';
    newItem.innerHTML = `
        <select class="item-product">
            <option value="">Select product...</option>
        </select>
        <input type="number" class="item-quantity" placeholder="Qty" min="1">
        <input type="number" class="item-price" placeholder="Price" step="0.01">
        <button type="button" onclick="removeInvoiceItem(this)" class="remove-button">Remove</button>
    `;
    itemsContainer.appendChild(newItem);
    
    // Only populate the new item's dropdown
    const newSelect = newItem.querySelector('.item-product');
    products.forEach(product => {
        const option = document.createElement('option');
        option.value = product.id;
        option.textContent = `${product.name} - $${product.price}`;
        newSelect.appendChild(option);
    });
    
    // Add event listeners to new inputs
    const inputs = newItem.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('change', updateCreateInvoiceTotals);
        input.addEventListener('input', updateCreateInvoiceTotals);
    });
    
    updateCreateInvoiceTotals();
}

// Remove invoice item
function removeInvoiceItem(button) {
    const itemsContainer = document.getElementById('invoice-items');
    const items = itemsContainer.querySelectorAll('.invoice-item');
    if (items.length > 1) {
        button.parentElement.remove();
        updateCreateInvoiceTotals();
    } else {
        alert('At least one item is required.');
    }
}

// Create new invoice (handles both regular and enhanced creation)
function createInvoice(event) {
    event.preventDefault();
    
    const form = event.target;
    const isEditing = form.dataset.editingInvoiceId;
    
    const customerId = parseInt(document.getElementById('invoiceCustomer').value);
    const customer = customers.find(c => c.id === customerId);
    const invoiceDate = document.getElementById('invoiceDate').value;
    const paidAtService = document.getElementById('invoicePaidAtService')?.checked || false;
    const dueDate = document.getElementById('invoiceDueDate').value;
    
    if (!customer) {
        alert('Please select a customer.');
        return;
    }
    
    if (!invoiceDate) {
        alert('Please select an invoice date.');
        return;
    }
    
    // Due date is only required if not paid at service
    if (!paidAtService && !dueDate) {
        alert('Please select a due date.');
        return;
    }
    
    // Get all items
    const itemElements = document.querySelectorAll('.invoice-item');
    const items = [];
    let subtotal = 0;
    
    itemElements.forEach(itemEl => {
        const productId = parseInt(itemEl.querySelector('.item-product').value);
        const quantity = parseInt(itemEl.querySelector('.item-quantity').value);
        const price = parseFloat(itemEl.querySelector('.item-price').value);
        
        if (productId && quantity && price) {
            const product = products.find(p => p.id === productId);
            items.push({
                productId: productId,
                productName: product.name,
                quantity: quantity,
                price: price,
                total: quantity * price
            });
            subtotal += quantity * price;
        }
    });
    
    if (items.length === 0) {
        alert('Please add at least one item with product, quantity, and price.');
        return;
    }
    
    // Calculate tax and total
    const taxRate = erpStorage.getTaxRate() || 8;
    const taxAmount = (subtotal * taxRate) / 100;
    const finalTotal = subtotal + taxAmount;
    
    if (isEditing) {
        // Update existing invoice
        const invoiceId = parseInt(isEditing);
        const existingInvoice = invoices.find(inv => inv.id === invoiceId);
        
        if (!existingInvoice) {
            alert('Invoice not found!');
            return;
        }
        
        const updatedInvoice = {
            ...existingInvoice,
            customerId: customerId,
            customerName: customer.name,
            dateCreated: invoiceDate,
            dueDate: dueDate,
            items: items,
            subtotal: subtotal,
            taxRate: taxRate,
            taxAmount: taxAmount,
            total: finalTotal
        };
        
        if (erpStorage.updateInvoice(invoiceId, updatedInvoice)) {
            const index = invoices.findIndex(inv => inv.id === invoiceId);
            if (index !== -1) {
                invoices[index] = { ...invoices[index], ...updatedInvoice };
            }
            
            alert('Invoice updated successfully!');
            delete form.dataset.editingInvoiceId;
            hideCreateInvoiceForm();
            displayInvoices();
        } else {
            alert('Error updating invoice.');
        }
    } else {
        // Create new invoice
        const invoiceNumber = `INV-${String(invoices.length + 1).padStart(5, '0')}`;
        
        // Check if invoice was paid at time of service
        const paidAtService = document.getElementById('invoicePaidAtService')?.checked || false;
        
        const newInvoice = {
            number: invoiceNumber,
            customerId: customerId,
            customerName: customer.name,
            dateCreated: invoiceDate,
            dueDate: paidAtService ? invoiceDate : dueDate,
            items: items,
            subtotal: subtotal,
            taxRate: taxRate,
            taxAmount: taxAmount,
            total: finalTotal,
            status: paidAtService ? 'Paid' : 'Pending',
            paidDate: paidAtService ? invoiceDate : null,
            paymentMethod: paidAtService ? 'Cash/Card' : null
        };
        
        const savedInvoice = erpStorage.addInvoice(newInvoice);
        
        if (savedInvoice) {
            invoices.push(savedInvoice);
            
            // Update product stock (only for physical products)
            items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                if (product && product.stock !== undefined) {
                    const productType = product.type || 'product';
                    if (productType === 'product') {
                        product.stock -= item.quantity;
                    }
                }
            });
            erpStorage.setProducts(products);
            
            // Check if user wants to generate PDF
            const generatePDFCheckbox = document.getElementById('generatePDFOnCreate');
            const generatePDF = generatePDFCheckbox && generatePDFCheckbox.checked;
            
            if (generatePDF && typeof invoicePDFGenerator !== 'undefined') {
                setTimeout(() => {
                    invoicePDFGenerator.generateInvoicePDF(savedInvoice);
                }, 300);
            }
            
            alert(`Invoice ${invoiceNumber} created successfully!${generatePDF ? ' PDF will download shortly.' : ''}`);
            hideCreateInvoiceForm();
            displayInvoices();
        } else {
            alert('Error creating invoice.');
        }
    }
}

// Alias for compatibility
window.createInvoiceEnhanced = createInvoice;

// Check for overdue invoices and update status
function updateOverdueInvoices() {
    const today = new Date();
    invoices.forEach(invoice => {
        const dueDate = new Date(invoice.dueDate);
        if (invoice.status === 'Pending' && dueDate < today) {
            invoice.status = 'Overdue';
            const updatedData = { status: 'Overdue' };
            erpStorage.updateInvoice(invoice.id, updatedData);
        }
    });
}

// Display invoices in the table
function displayInvoices(filter = 'all') {
    currentStatusFilter = filter;
    applyInvoiceFilters();
}

// Filter invoices
function filterInvoices(filter) {
    displayInvoices(filter);
}

// Sort invoices by due date
function sortInvoicesByDueDate() {
    currentSortOrder.dueDate = currentSortOrder.dueDate === 'asc' ? 'desc' : 'asc';
    
    invoices.sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        
        if (currentSortOrder.dueDate === 'asc') {
            return dateA - dateB;
        } else {
            return dateB - dateA;
        }
    });
    
    displayInvoices();
}

// Utility function to format dates as mm/dd/yyyy
function formatDate(dateString) {
    if (!dateString) return '';
    // Parse date string directly to avoid timezone issues
    const [year, month, day] = dateString.split('-');
    return `${month}/${day}/${year}`;
}

// Mark invoice as paid
function markAsPaid(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        const updatedData = { status: 'Paid' };
        if (erpStorage.updateInvoice(invoiceId, updatedData)) {
            invoice.status = 'Paid';
            displayInvoices();
            alert('Invoice marked as paid!');
        }
    }
}

// Mark invoice as unpaid
function markAsUnpaid(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (invoice) {
        const today = new Date();
        const dueDate = new Date(invoice.dueDate);
        const newStatus = dueDate < today ? 'Overdue' : 'Pending';
        
        const updatedData = { status: newStatus };
        if (erpStorage.updateInvoice(invoiceId, updatedData)) {
            invoice.status = newStatus;
            displayInvoices();
            alert(`Invoice marked as ${newStatus}!`);
        }
    }
}

// View invoice details
function viewInvoice(invoiceId) {
    generateInvoicePDF(invoiceId);
}

// Delete invoice
async function deleteInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found!');
        return;
    }
    
    if (confirm(`Are you sure you want to delete Invoice #${invoice.id} for ${invoice.customerName}?\n\nAmount: $${invoice.total.toFixed(2)}\nThis action cannot be undone.`)) {
        LoadingState.showOverlay('Deleting invoice...');
        
        await LoadingState.simulateAsync(() => {
            if (erpStorage.deleteInvoice(invoiceId)) {
                invoices = invoices.filter(inv => inv.id !== invoiceId);
            }
        }, 400);
        
        LoadingState.hideOverlay();
        displayInvoices();
        alert('Invoice deleted successfully!');
    }
}

// Edit invoice
function editInvoice(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found!');
        return;
    }
    
    // Show the create invoice form
    showCreateInvoiceForm();
    
    // Update form title
    const formTitle = document.querySelector('#create-invoice-form h3');
    if (formTitle) {
        formTitle.textContent = 'Edit Invoice';
    }
    
    // Populate form fields
    setTimeout(() => {
        document.getElementById('invoiceCustomer').value = invoice.customerId;
        document.getElementById('invoiceDate').value = invoice.dateCreated;
        document.getElementById('invoiceDueDate').value = invoice.dueDate;
        
        // Clear existing items but keep the container structure
        const itemsContainer = document.getElementById('invoice-items');
        const existingItems = itemsContainer.querySelectorAll('.invoice-item');
        existingItems.forEach(item => item.remove());
        
        // Add invoice items
        invoice.items.forEach((item, index) => {
            // Create new item element
            const newItemDiv = document.createElement('div');
            newItemDiv.className = 'invoice-item';
            newItemDiv.innerHTML = `
                <select class="item-product">
                    <option value="">Select product...</option>
                </select>
                <input type="number" class="item-quantity" placeholder="Qty" min="1">
                <input type="number" class="item-price" placeholder="Price" step="0.01">
                <button type="button" onclick="removeInvoiceItem(this)" class="remove-button">Remove</button>
            `;
            itemsContainer.appendChild(newItemDiv);
            
            // Populate product dropdown
            const productSelect = newItemDiv.querySelector('.item-product');
            products.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id;
                option.textContent = `${product.name} - $${product.price}`;
                productSelect.appendChild(option);
            });
            
            // Set values
            productSelect.value = item.productId;
            newItemDiv.querySelector('.item-quantity').value = item.quantity;
            newItemDiv.querySelector('.item-price').value = item.price;
            
            // Add event listeners
            const inputs = newItemDiv.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('change', updateCreateInvoiceTotals);
                input.addEventListener('input', updateCreateInvoiceTotals);
            });
        });
        
        // Update totals
        updateCreateInvoiceTotals();
        
        // Change submit button
        const form = document.querySelector('#create-invoice-form form');
        const submitButton = form.querySelector('button[type="submit"]');
        if (submitButton) {
            submitButton.textContent = 'Update Invoice';
        }
        
        // Store invoice ID for update
        form.dataset.editingInvoiceId = invoiceId;
    }, 100);
}

// Update invoices summary
function updateInvoicesSummary() {
    const today = new Date();
    
    let totalPending = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let paidThisMonth = 0;
    
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    invoices.forEach(invoice => {
        if (invoice.status === 'Pending' || invoice.status === 'Overdue') {
            totalPending += invoice.total;
        }
        
        if (invoice.status === 'Overdue') {
            overdueAmount += invoice.total;
            overdueCount++;
        }
        
        if (invoice.status === 'Paid') {
            const invoiceMonth = new Date(invoice.dateCreated).getMonth();
            const invoiceYear = new Date(invoice.dateCreated).getFullYear();
            if (invoiceMonth === currentMonth && invoiceYear === currentYear) {
                paidThisMonth += invoice.total;
            }
        }
    });
    
    document.getElementById('total-pending').textContent = totalPending.toFixed(2);
    document.getElementById('overdue-amount').textContent = overdueAmount.toFixed(2);
    document.getElementById('overdue-invoices').textContent = overdueCount;
    document.getElementById('paid-this-month').textContent = paidThisMonth.toFixed(2);
}

// === INVOICE TOTALS FUNCTIONALITY ===

// Add invoice totals section to create form
function addInvoiceTotalsSection() {
    const invoiceItems = document.getElementById('invoice-items');
    
    if (invoiceItems && !document.getElementById('create-subtotal')) {
        const totalsHTML = `
            <div id="invoice-totals-preview" class="invoice-totals-preview">
                <div class="invoice-subtotal">
                    <strong>Subtotal: $<span id="create-subtotal">0.00</span></strong>
                </div>
                <div class="invoice-tax">
                    Tax (<span id="create-tax-rate">0.00</span>%): $<span id="create-tax-amount">0.00</span>
                </div>
                <div class="invoice-total">
                    <strong>Total: $<span id="create-total">0.00</span></strong>
                </div>
            </div>
        `;
        
        invoiceItems.insertAdjacentHTML('afterend', totalsHTML);
        
        // Initialize tax rate
        const taxRate = erpStorage.getTaxRate() || 8;
        const taxRateEl = document.getElementById('create-tax-rate');
        if (taxRateEl) {
            taxRateEl.textContent = taxRate.toFixed(2);
        }
    }
}

// Update create invoice totals
function updateCreateInvoiceTotals() {
    let subtotal = 0;
    
    const createForm = document.getElementById('create-invoice-form');
    if (createForm) {
        const invoiceItems = createForm.querySelectorAll('.invoice-item');
        
        invoiceItems.forEach(itemRow => {
            const productSelect = itemRow.querySelector('.item-product');
            const quantityInput = itemRow.querySelector('.item-quantity');
            const priceInput = itemRow.querySelector('.item-price');
            
            if (productSelect && quantityInput && priceInput) {
                const quantity = parseFloat(quantityInput.value) || 0;
                let price = parseFloat(priceInput.value) || 0;
                
                // Auto-fill price from product if not set
                if (price === 0 && productSelect.value) {
                    const selectedOption = productSelect.options[productSelect.selectedIndex];
                    if (selectedOption && selectedOption.text.includes('$')) {
                        const priceMatch = selectedOption.text.match(/\$(\d+\.?\d*)/);
                        if (priceMatch) {
                            price = parseFloat(priceMatch[1]);
                            priceInput.value = price.toFixed(2);
                        }
                    }
                }
                
                subtotal += quantity * price;
            }
        });
    }
    
    const taxRate = erpStorage.getTaxRate() || 8;
    const taxAmount = (subtotal * taxRate) / 100;
    const total = subtotal + taxAmount;
    
    const subtotalEl = document.getElementById('create-subtotal');
    const taxRateEl = document.getElementById('create-tax-rate');
    const taxAmountEl = document.getElementById('create-tax-amount');
    const totalEl = document.getElementById('create-total');
    
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
    if (taxRateEl) taxRateEl.textContent = taxRate.toFixed(2);
    if (taxAmountEl) taxAmountEl.textContent = taxAmount.toFixed(2);
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

// Setup form monitoring for real-time updates
function setupFormMonitoring() {
    setTimeout(() => {
        const createForm = document.getElementById('create-invoice-form');
        if (createForm) {
            const formInputs = createForm.querySelectorAll('input, select');
            formInputs.forEach(input => {
                input.addEventListener('change', updateCreateInvoiceTotals);
                input.addEventListener('input', updateCreateInvoiceTotals);
            });
        }
    }, 1000);
}

// === INVOICE PAYMENT DIALOG SYSTEM ===

function showInvoicePaymentDialog(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) {
        alert('Invoice not found!');
        return;
    }

    if (invoice.status === 'Paid') {
        showInvoicePaymentHistory(invoiceId);
        return;
    }

    const totalPaid = invoice.payments ? invoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const remainingAmount = invoice.total - totalPaid;
    const isPartialPayment = totalPaid > 0;
    const today = new Date().toISOString().split('T')[0];

    const dialogHTML = `
        <div id="invoice-payment-dialog" class="payment-dialog">
            <div class="payment-dialog-content">
                <h3 class="payment-dialog-header">
                    ${isPartialPayment ? 'Additional Payment' : 'Record Payment'}
                </h3>
                
                <div class="payment-info-box">
                    <div><strong>Customer:</strong> ${invoice.customerName}</div>
                    <div><strong>Invoice #:</strong> ${invoice.number}</div>
                    <div class="payment-total">
                        <strong>Original Amount:</strong> $${invoice.total.toFixed(2)}
                    </div>
                    ${isPartialPayment ? `
                        <div class="payment-amount-paid">
                            <strong>Already Paid:</strong> $${totalPaid.toFixed(2)}
                        </div>
                        <div class="payment-amount-due">
                            <strong>Remaining Balance:</strong> $${remainingAmount.toFixed(2)}
                        </div>
                    ` : ''}
                </div>
                
                <form id="invoice-payment-form">
                    <div class="payment-form-group">
                        <label class="payment-form-label">Payment Type:</label>
                        <select id="invoicePaymentType" required class="payment-form-input">
                            <option value="">Select payment method...</option>
                            ${paymentTypes.map(type => `<option value="${type}">${type}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="payment-form-group">
                        <label class="payment-form-label">Payment Date:</label>
                        <input type="date" id="invoicePaymentDate" value="${today}" required class="payment-form-input">
                    </div>
                    
                    <div class="payment-form-group">
                        <label class="payment-form-label">Reference/Check Number:</label>
                        <input type="text" id="invoicePaymentReference" placeholder="Check #, Transaction ID, etc." class="payment-form-input">
                    </div>
                    
                    <div class="payment-form-group">
                        <label class="payment-form-label">Payment Amount:</label>
                        <input type="number" id="invoicePaymentAmount" value="${remainingAmount.toFixed(2)}" step="0.01" min="0.01" required class="payment-form-input">
                        <small class="payment-form-hint">Maximum remaining amount: $${remainingAmount.toFixed(2)}</small>
                    </div>
                    
                    <div class="payment-form-group">
                        <label class="payment-form-label">Payment Notes:</label>
                        <textarea id="invoicePaymentNotes" placeholder="Additional notes..." class="payment-form-input invoice-payment-notes-textarea"></textarea>
                    </div>
                    
                    <div class="payment-actions">
                        <button type="button" onclick="closeInvoicePaymentDialog()" class="payment-cancel-button">Cancel</button>
                        <button type="submit" class="payment-submit-button">Record Payment</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    closeInvoicePaymentDialog();
    document.body.insertAdjacentHTML('beforeend', dialogHTML);

    document.getElementById('invoice-payment-form').addEventListener('submit', (e) => {
        e.preventDefault();
        processInvoicePayment(invoiceId);
    });
}

function processInvoicePayment(invoiceId) {
    const paymentType = document.getElementById('invoicePaymentType').value;
    const paymentDate = document.getElementById('invoicePaymentDate').value;
    const paymentReference = document.getElementById('invoicePaymentReference').value;
    const paymentAmount = parseFloat(document.getElementById('invoicePaymentAmount').value);
    const paymentNotes = document.getElementById('invoicePaymentNotes').value;

    if (!paymentType || !paymentDate || paymentAmount <= 0) {
        alert('Please fill in all required fields.');
        return;
    }

    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const totalPaid = invoice.payments ? invoice.payments.reduce((sum, p) => sum + p.amount, 0) : 0;
    const remainingAmount = invoice.total - totalPaid;
    
    // Check if payment exceeds remaining amount (with small tolerance for rounding)
    if (paymentAmount > remainingAmount + 0.01) {
        alert(`Payment amount ($${paymentAmount.toFixed(2)}) exceeds remaining balance ($${remainingAmount.toFixed(2)}). Please enter a valid amount.`);
        return;
    }

    const payment = {
        id: Date.now(),
        type: paymentType,
        date: paymentDate,
        amount: paymentAmount,
        reference: paymentReference,
        notes: paymentNotes,
        recordedDate: new Date().toISOString()
    };

    if (!invoice.payments) invoice.payments = [];
    invoice.payments.push(payment);

    const newTotalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    
    // Use a small tolerance (1 cent) to handle rounding issues
    const tolerance = 0.01;
    const remaining = invoice.total - newTotalPaid;
    
    if (Math.abs(remaining) <= tolerance || newTotalPaid >= invoice.total) {
        // Invoice is fully paid (or overpaid by less than 1 cent)
        invoice.status = 'Paid';
        invoice.paymentDate = paymentDate;
        invoice.paymentType = paymentType;
        invoice.paymentReference = paymentReference;
    } else {
        // Invoice is partially paid
        invoice.status = `Partial ($${newTotalPaid.toFixed(2)})`;
    }

    // Update in storage
    erpStorage.updateInvoice(invoiceId, {
        status: invoice.status,
        payments: invoice.payments,
        paymentDate: invoice.paymentDate,
        paymentType: invoice.paymentType,
        paymentReference: invoice.paymentReference
    });

    closeInvoicePaymentDialog();
    loadData();
    displayInvoices();

    const message = invoice.status === 'Paid' ? 
        'Payment recorded successfully! Invoice is now fully paid.' :
        `Partial payment recorded! Paid $${newTotalPaid.toFixed(2)} of $${invoice.total.toFixed(2)} (remaining: $${remaining.toFixed(2)})`;
    
    alert(message);
}

function showInvoicePaymentHistory(invoiceId) {
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice || !invoice.payments) {
        alert('No payment history found.');
        return;
    }

    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);

    const historyHTML = `
        <div id="invoice-payment-dialog" class="payment-dialog">
            <div class="payment-dialog-content payment-dialog-wide payment-dialog-scrollable">
                <h3 class="payment-dialog-header">Payment History</h3>
                
                <div class="payment-info-box">
                    <div><strong>Customer:</strong> ${invoice.customerName}</div>
                    <div><strong>Invoice #:</strong> ${invoice.number}</div>
                    <div><strong>Invoice Amount:</strong> $${invoice.total.toFixed(2)}</div>
                    <div class="text-success font-bold"><strong>Total Paid:</strong> $${totalPaid.toFixed(2)}</div>
                </div>
                
                <h4>Payment Records:</h4>
                ${invoice.payments.map((payment, index) => `
                    <div class="payment-history-item">
                        <div class="payment-history-grid">
                            <div><strong>Payment #${index + 1}</strong></div>
                            <div class="payment-history-amount">$${payment.amount.toFixed(2)}</div>
                            <div><strong>Type:</strong> ${payment.type}</div>
                            <div><strong>Date:</strong> ${formatDate(payment.date)}</div>
                            ${payment.reference ? `<div><strong>Reference:</strong> ${payment.reference}</div>` : '<div></div>'}
                            ${payment.notes ? `<div class="payment-history-notes"><strong>Notes:</strong> ${payment.notes}</div>` : ''}
                        </div>
                    </div>
                `).join('')}
                
                <div class="payment-actions">
                    <button onclick="closeInvoicePaymentDialog()" class="payment-close-button">Close</button>
                </div>
            </div>
        </div>
    `;

    closeInvoicePaymentDialog();
    document.body.insertAdjacentHTML('beforeend', historyHTML);
}

function closeInvoicePaymentDialog() {
    const dialog = document.getElementById('invoice-payment-dialog');
    if (dialog) dialog.remove();
}

// Make functions globally available
window.showInvoicePaymentDialog = showInvoicePaymentDialog;
window.showInvoicePaymentHistory = showInvoicePaymentHistory;
window.closeInvoicePaymentDialog = closeInvoicePaymentDialog;

// Search and Filter Functions
let allInvoices = [];
let currentSearchTerm = '';
let currentStatusFilter = 'all';
let currentInvoicePage = 1;
let invoicePageSize = 50;

function searchInvoices() {
    const searchInput = document.getElementById('invoiceSearchInput');
    const clearButton = document.getElementById('invoiceSearchClear');
    currentSearchTerm = searchInput.value.toLowerCase().trim();
    
    // Show/hide clear button
    if (currentSearchTerm.length > 0) {
        clearButton.classList.add('visible');
    } else {
        clearButton.classList.remove('visible');
    }
    
    currentInvoicePage = 1; // Reset to first page on new search
    applyInvoiceFilters();
}

function clearInvoiceSearch() {
    const searchInput = document.getElementById('invoiceSearchInput');
    const clearButton = document.getElementById('invoiceSearchClear');
    searchInput.value = '';
    currentSearchTerm = '';
    clearButton.classList.remove('visible');
    currentInvoicePage = 1;
    applyInvoiceFilters();
}

function applyInvoiceFilters() {
    const tbody = document.getElementById('invoices-tbody');
    tbody.innerHTML = '';
    
    // Update any pending invoices that are now overdue
    const today = new Date();
    let hasUpdates = false;
    invoices.forEach(invoice => {
        const dueDate = new Date(invoice.dueDate);
        if (invoice.status === 'Pending' && dueDate < today) {
            const updatedData = { status: 'Overdue' };
            if (erpStorage.updateInvoice(invoice.id, updatedData)) {
                invoice.status = 'Overdue';
                hasUpdates = true;
            }
        }
    });
    
    if (hasUpdates) {
        loadData();
    }
    
    let filteredInvoices = invoices;
    
    // Apply status filter
    if (currentStatusFilter !== 'all') {
        filteredInvoices = filteredInvoices.filter(invoice => {
            if (currentStatusFilter === 'overdue') {
                return invoice.status === 'Overdue';
            }
            return invoice.status && invoice.status.toLowerCase() === currentStatusFilter;
        });
    }
    
    // Apply search filter
    if (currentSearchTerm) {
        filteredInvoices = filteredInvoices.filter(invoice => {
            const customerName = invoice.customerName ? invoice.customerName.toLowerCase() : '';
            const invoiceNumber = invoice.number ? invoice.number.toLowerCase() : '';
            const total = invoice.total ? invoice.total.toString() : '';
            const status = invoice.status ? invoice.status.toLowerCase() : '';
            
            return customerName.includes(currentSearchTerm) ||
                   invoiceNumber.includes(currentSearchTerm) ||
                   total.includes(currentSearchTerm) ||
                   status.includes(currentSearchTerm);
        });
    }
    
    // Calculate pagination
    const totalInvoices = filteredInvoices.length;
    const totalPages = invoicePageSize === 'all' ? 1 : Math.ceil(totalInvoices / invoicePageSize);
    
    // Ensure current page is valid
    if (currentInvoicePage > totalPages && totalPages > 0) {
        currentInvoicePage = totalPages;
    }
    if (currentInvoicePage < 1) {
        currentInvoicePage = 1;
    }
    
    // Get invoices for current page
    let paginatedInvoices = filteredInvoices;
    let startIndex = 0;
    let endIndex = totalInvoices;
    
    if (invoicePageSize !== 'all') {
        startIndex = (currentInvoicePage - 1) * invoicePageSize;
        endIndex = Math.min(startIndex + invoicePageSize, totalInvoices);
        paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
    }
    
    paginatedInvoices.forEach(invoice => {
        // Skip invoices with missing critical data
        if (!invoice.total || !invoice.status || !invoice.dueDate) {
            console.warn('Skipping invoice with missing data:', invoice);
            return;
        }
        
        const dueDate = new Date(invoice.dueDate);
        let status = invoice.status;
        let statusColor = '#666';
        
        if (status === 'Paid') {
            statusColor = '#5cb85c';
        } else if (status === 'Overdue') {
            statusColor = '#d9534f';
        } else if (status === 'Pending') {
            statusColor = '#f0ad4e';
        } else if (status && status.startsWith('Partial')) {
            statusColor = '#f0ad4e';
        }
        
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        const isDueSoon = dueDate <= oneWeekFromNow && dueDate >= today;
        
        const row = document.createElement('tr');
        if (isDueSoon && status !== 'Paid') {
            row.style.backgroundColor = '#fff3cd';
        } else if (status === 'Overdue') {
            row.style.backgroundColor = '#ffebee';
        } else if (status === 'Paid') {
            row.style.backgroundColor = '#e8f5e8';
        }
        
        const statusClass = status === 'Paid' ? 'invoice-status-paid' : status === 'Overdue' ? 'invoice-status-overdue' : 'invoice-status-unpaid';
        row.innerHTML = `
            <td>${invoice.number || 'N/A'}</td>
            <td>${invoice.customerName || 'Unknown'}</td>
            <td>${formatDate(invoice.dateCreated)}</td>
            <td>${formatDate(invoice.dueDate)}${isDueSoon && status !== 'Paid' ? ' <span class="invoice-due-warning">⚠️</span>' : ''}</td>
            <td>$${invoice.total.toFixed(2)}</td>
            <td class="${statusClass}">${status}</td>
            <td>
                <button class="button button-warning button-small" onclick="generateInvoicePDF(${invoice.id})">PDF</button>
                ${getInvoiceActionButtons(invoice)}
                <button class="button button-small" onclick="editInvoice(${invoice.id})">Edit</button>
                <button class="button button-danger button-small" onclick="deleteInvoice(${invoice.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Update pagination info
    updateInvoicePaginationInfo(startIndex + 1, endIndex, totalInvoices, currentInvoicePage, totalPages);
    
    updateInvoicesSummary();
}

function updateInvoicePaginationInfo(start, end, total, currentPage, totalPages) {
    document.getElementById('invoice-start').textContent = total === 0 ? 0 : start;
    document.getElementById('invoice-end').textContent = end;
    document.getElementById('invoice-total').textContent = total;
    document.getElementById('invoice-page-info').textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Enable/disable pagination buttons
    const prevBtn = document.getElementById('invoice-prev-btn');
    const nextBtn = document.getElementById('invoice-next-btn');
    
    if (prevBtn && nextBtn) {
        prevBtn.disabled = currentPage <= 1;
        nextBtn.disabled = currentPage >= totalPages;
    }
}

function changeInvoicePageSize() {
    const select = document.getElementById('invoicePageSize');
    invoicePageSize = select.value === 'all' ? 'all' : parseInt(select.value);
    currentInvoicePage = 1;
    applyInvoiceFilters();
}

function previousInvoicePage() {
    if (currentInvoicePage > 1) {
        currentInvoicePage--;
        applyInvoiceFilters();
    }
}

function nextInvoicePage() {
    const totalInvoices = invoices.length; // This should be filtered invoices count
    const totalPages = invoicePageSize === 'all' ? 1 : Math.ceil(totalInvoices / invoicePageSize);
    if (currentInvoicePage < totalPages) {
        currentInvoicePage++;
        applyInvoiceFilters();
    }
}

// Get invoice action buttons based on status
function getInvoiceActionButtons(invoice) {
    if (invoice.status === 'Paid') {
        return `<button class="button button-success button-small" onclick="showInvoicePaymentHistory(${invoice.id})">History</button>`;
    } else if (invoice.status && invoice.status.startsWith('Partial')) {
        return `
            <button class="button button-success button-small" onclick="showInvoicePaymentDialog(${invoice.id})">Payment</button>
            <button class="button button-primary button-small" onclick="showInvoicePaymentHistory(${invoice.id})">History</button>
        `;
    } else {
        return `<button class="button button-success button-small" onclick="showInvoicePaymentDialog(${invoice.id})">Payment</button>`;
    }
}

// Update the original filterInvoices function to work with search
const originalFilterInvoices = window.filterInvoices;
window.filterInvoices = function(filter) {
    currentStatusFilter = filter;
    currentInvoicePage = 1; // Reset to first page when changing filter
    applyInvoiceFilters();
};

window.searchInvoices = searchInvoices;
window.clearInvoiceSearch = clearInvoiceSearch;
window.changeInvoicePageSize = changeInvoicePageSize;
window.previousInvoicePage = previousInvoicePage;
window.nextInvoicePage = nextInvoicePage;
window.toggleInvoiceDueDateField = toggleInvoiceDueDateField;

// Export functions
function exportInvoicesToCSV() {
    const formattedData = ExportUtility.formatInvoicesForExport(invoices, customers);
    const filename = `invoices_${ExportUtility.getDateForFilename()}.csv`;
    ExportUtility.exportToCSV(formattedData, filename);
}

function exportInvoicesToJSON() {
    const filename = `invoices_${ExportUtility.getDateForFilename()}.json`;
    ExportUtility.exportToJSON(invoices, filename);
}

window.exportInvoicesToCSV = exportInvoicesToCSV;
window.exportInvoicesToJSON = exportInvoicesToJSON;

console.log('Consolidated invoice management system loaded');
console.log('Invoice payment recording system enabled');
console.log('Invoice search functionality enabled');
console.log('Invoice pagination enabled');