// Employee management functionality with LocalStorage
let employees = [];
let currentEmployeeFilter = 'all';

// Load data from storage
function loadEmployeeData() {
    employees = JSON.parse(localStorage.getItem('erp_employees') || '[]');
}

// Save data to storage
function saveEmployeeData() {
    localStorage.setItem('erp_employees', JSON.stringify(employees));
}

// Display employees in the table
function displayEmployees(filter = 'all') {
    const tbody = document.getElementById('employees-tbody');
    tbody.innerHTML = '';
    
    let filteredEmployees = employees;
    
    if (filter !== 'all') {
        filteredEmployees = employees.filter(employee => employee.payType === filter);
    }
    
    filteredEmployees.forEach(employee => {
        const row = document.createElement('tr');
        const payRateDisplay = employee.payType === 'hourly' ? `$${employee.payRate}/hr` : `$${employee.payRate}/year`;
        
        // Handle optional fields with fallbacks
        const department = employee.department || 'Not specified';
        const position = employee.position || 'Not specified';
        
        row.innerHTML = `
            <td>${employee.firstName} ${employee.lastName}</td>
            <td>${department}</td>
            <td>${position}</td>
            <td>${employee.payType.charAt(0).toUpperCase() + employee.payType.slice(1)}</td>
            <td>${payRateDisplay}</td>
            <td>${formatDate(employee.hireDate)}</td>
            <td>
                <button class="button button-warning button-small" onclick="editEmployee(${employee.id})">Edit</button>
                <button class="button button-danger button-small" onclick="deleteEmployee(${employee.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Show add employee form
function showAddEmployeeForm() {
    document.getElementById('add-employee-form').style.display = 'block';
}

// Hide add employee form
function hideAddEmployeeForm() {
    document.getElementById('add-employee-form').style.display = 'none';
    clearEmployeeForm();
}

// Toggle pay fields based on pay type
function togglePayFields() {
    const payType = document.getElementById('payType').value;
    const payRateLabel = document.getElementById('payRateLabel');
    const payRateInput = document.getElementById('payRate');
    
    if (payType === 'hourly') {
        payRateLabel.textContent = 'Hourly Rate ($):';
        payRateInput.placeholder = '15.00';
    } else if (payType === 'salary') {
        payRateLabel.textContent = 'Annual Salary ($):';
        payRateInput.placeholder = '50000.00';
    }
}

// Add new employee
function addEmployee(event) {
    event.preventDefault();
    
    // Auto-generate employee number (EMP001, EMP002, etc.)
    const employeeNumber = `EMP${String(employees.length + 1).padStart(3, '0')}`;
    
    const employeeData = {
        id: Date.now(),
        employeeNumber: employeeNumber, // Auto-generated for internal use
        firstName: document.getElementById('employeeFirstName').value,
        lastName: document.getElementById('employeeLastName').value,
        email: document.getElementById('employeeEmail').value || null, // Optional
        department: document.getElementById('employeeDepartment').value || null, // Optional
        position: document.getElementById('employeePosition').value || null, // Optional
        payType: document.getElementById('payType').value,
        payRate: parseFloat(document.getElementById('payRate').value),
        hireDate: document.getElementById('hireDate').value,
        dateCreated: new Date().toISOString().split('T')[0]
    };
    
    employees.push(employeeData);
    saveEmployeeData();
    displayEmployees(currentEmployeeFilter);
    hideAddEmployeeForm();
    alert('Employee added successfully!');
}

// Clear employee form
function clearEmployeeForm() {
    document.getElementById('employeeFirstName').value = '';
    document.getElementById('employeeLastName').value = '';
    document.getElementById('employeeEmail').value = '';
    document.getElementById('employeeDepartment').value = '';
    document.getElementById('employeePosition').value = '';
    document.getElementById('payType').value = '';
    document.getElementById('payRate').value = '';
    document.getElementById('hireDate').value = '';
}

// Filter employees
function filterEmployees(filter) {
    currentEmployeeFilter = filter;
    displayEmployees(filter);
    
    // Update button styles
    const buttons = document.querySelectorAll('.filter-buttons .button');
    buttons.forEach(btn => btn.style.opacity = '0.7');
    event.target.style.opacity = '1';
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

// Delete employee
function deleteEmployee(id) {
    const employee = employees.find(emp => emp.id === id);
    if (!employee) {
        alert('Employee not found!');
        return;
    }
    
    if (confirm(`Are you sure you want to delete employee "${employee.firstName} ${employee.lastName}"?\n\nThis action cannot be undone.`)) {
        employees = employees.filter(emp => emp.id !== id);
        saveEmployeeData();
        displayEmployees(currentEmployeeFilter);
        alert('Employee deleted successfully!');
    }
}

// Edit employee
function editEmployee(id) {
    alert('Edit employee functionality coming soon!');
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    loadEmployeeData();
    displayEmployees();
    
    // Highlight "All" filter button by default
    const allButton = document.querySelector('.filter-buttons .button.all');
    if (allButton) allButton.style.opacity = '1';
});

console.log('Employee Management System loaded');
console.log('Features: Employee management');
