// assets/js/candidate.js

// API Base URL from config
const API_BASE_URL = config.backendBaseUrl;

console.log('API Base URL:', API_BASE_URL);

// DOM Elements
const candidatesTable = $('#candidatesTable');
let dataTable = null;

// Variables
let currentImageFile = null;
let currentEditImageFile = null;

// Initialize DataTable
function initializeDataTable() {
    if (dataTable) {
        dataTable.destroy();
    }

    dataTable = candidatesTable.DataTable({
        "order": [[5, 'desc']],
        "pageLength": 10,
        "language": {
            "search": "Search:",
            "lengthMenu": "Show _MENU_ entries",
            "info": "Showing _START_ to _END_ of _TOTAL_ entries",
            "infoEmpty": "Showing 0 to 0 of 0 entries",
            "infoFiltered": "(filtered from _MAX_ total entries)",
            "paginate": {
                "first": "First",
                "last": "Last",
                "next": "Next",
                "previous": "Previous"
            }
        }
    });
}

// Load Candidates
async function loadCandidates() {
    try {
        console.log('Reloading candidates...');

        const response = await fetch(`${API_BASE_URL}/api/allCandidates`);
        const result = await response.json();

        const candidates = result.data || result;

        // ✅ destroy old datatable first
        if (dataTable) {
            dataTable.clear().destroy();
            dataTable = null;
        }

        const tbody = candidatesTable.find('tbody');
        tbody.empty();

        if (!candidates || candidates.length === 0) {
            tbody.append(`
                <tr>
                    <td colspan="7" class="text-center">No candidates found</td>
                </tr>
            `);
            return;
        }

        candidates.forEach(candidate => {
            const date = new Date(candidate.createdAt);
            const formattedDate = date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });

            const row = `
                <tr data-id="${candidate._id}">
                    <td>
                        <img src="${candidate.img}" alt="${candidate.name}" class="candidate-table-img" 
                             onerror="this.src='https://via.placeholder.com/50?text=No+Image'">
                    </td>
                    <td>${candidate.name}</td>
                    <td>${candidate.entry}</td>
                    <td>${candidate.board}</td>
                    <td>
                        <span class="status-badge ${candidate.status === 'active' ? 'status-active' : 'status-inactive'}">
                            ${candidate.status}
                        </span>
                    </td>
                    <td>${formattedDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" onclick="editCandidate('${candidate._id}')">
                               
                                <i class="fa-solid fa-pen-to-square"></i>


                            </button>
                            <button class="action-btn delete" onclick="deleteCandidate('${candidate._id}')">
                               
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });

        // ✅ re-init datatable
        initializeDataTable();

        console.log("Candidates refreshed");

    } catch (error) {
        console.error("Reload error:", error);
    }
}

// Setup image upload handlers
function setupImageUploadHandlers() {
    console.log('Setting up image upload handlers...');

    // Main image upload
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const imageUploadArea = document.getElementById('imageUploadArea');

    // Edit image upload
    const editImageInput = document.getElementById('editImageInput');
    const editImagePreview = document.getElementById('editImagePreview');
    const editImageUploadArea = document.getElementById('editImageUploadArea');

    // FIX: Ek hi event listener rakho (remove duplicate)
    if (imageUploadArea) {
        imageUploadArea.addEventListener('click', function () {
            console.log('Upload area clicked - Single Event');
            imageInput.click();
        });
    }

    if (editImageUploadArea) {
        editImageUploadArea.addEventListener('click', function () {
            console.log('Edit upload area clicked - Single Event');
            editImageInput.click();
        });
    }

    // File change events
    if (imageInput) {
        imageInput.addEventListener('change', function (e) {
            console.log('Image selected:', e.target.files[0]);
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                handleImageUpload(file, imagePreview, imageUploadArea);
                currentImageFile = file;
            }
        });
    }

    if (editImageInput) {
        editImageInput.addEventListener('change', function (e) {
            console.log('Edit image selected:', e.target.files[0]);
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                handleImageUpload(file, editImagePreview, editImageUploadArea);
                currentEditImageFile = file;
            }
        });
    }
}

// Handle image upload
function handleImageUpload(file, previewElement, uploadArea) {
    console.log('Handling image upload:', file.name);

    if (!file.type.startsWith('image/')) {
        showAlert('Please select an image file (PNG, JPG, JPEG)', 'error');
        return;
    }

    if (file.size > 5 * 1024 * 1024) {
        showAlert('Image size should be less than 5MB', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        previewElement.src = e.target.result;
        previewElement.style.display = 'block';
        uploadArea.style.display = 'none';
        console.log('Image preview updated');
    };
    reader.onerror = (error) => {
        console.error('Error reading file:', error);
        showAlert('Error reading image file', 'error');
    };
    reader.readAsDataURL(file);
}

// Add candidate form submit
function handleAddCandidateFormSubmit(e) {
    e.preventDefault(); // Prevent default form submission
    console.log('Add form submitted');

    const name = document.getElementById('name').value.trim();
    const entry = document.getElementById('entry').value.trim();
    const board = document.getElementById('board').value.trim();
    const status = document.getElementById('status').value;

    if (!name || !entry || !board) {
        showAlert('Please fill all required fields', 'error');
        return;
    }

    if (!currentImageFile) {
        showAlert('Please select an image', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('entry', entry);
    formData.append('board', board);
    formData.append('status', status);
    formData.append('img', currentImageFile);

    // Show loading state
    const submitBtnText = document.getElementById('submitBtnText');
    const submitSpinner = document.getElementById('submitSpinner');
    const submitCandidateBtn = document.getElementById('submitCandidateBtn');

    submitBtnText.textContent = 'Adding...';
    submitSpinner.classList.remove('d-none');
    submitCandidateBtn.disabled = true;

    fetch(`${API_BASE_URL}/api/addCandidate`, {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Add response:', result);

            // Check different response formats
            if (result.success || result.message === 'Candidate added successfully') {
                showAlert('Candidate added successfully!', 'success');
                $('#addCandidateModal').modal('hide'); // FIX: Modal close
                resetAddForm();
                loadCandidates(); // FIX: Auto reload
            } else {
                throw new Error(result.message || result.error || 'Failed to add candidate');
            }
        })
        .catch(error => {
            console.error('Add candidate error:', error);
            showAlert(error.message, 'error');
        })
        .finally(() => {
            // Reset button state
            submitBtnText.textContent = 'Add Candidate';
            submitSpinner.classList.add('d-none');
            submitCandidateBtn.disabled = false;
        });
}

// Edit Candidate
async function editCandidate(id) {
    try {
        console.log('Editing candidate:', id);
        const response = await fetch(`${API_BASE_URL}/api/candidate/${id}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const candidate = result.data || result;

        document.getElementById('editCandidateId').value = candidate._id;
        document.getElementById('editName').value = candidate.name;
        document.getElementById('editEntry').value = candidate.entry;
        document.getElementById('editBoard').value = candidate.board;
        document.getElementById('editStatus').value = candidate.status;

        // Set image preview
        const editImagePreview = document.getElementById('editImagePreview');
        const editImageUploadArea = document.getElementById('editImageUploadArea');

        if (candidate.img) {
            editImagePreview.src = candidate.img;
            editImagePreview.style.display = 'block';
            editImageUploadArea.style.display = 'none';
        } else {
            editImagePreview.style.display = 'none';
            editImageUploadArea.style.display = 'flex';
        }

        currentEditImageFile = null;

        $('#editCandidateModal').modal('show');
    } catch (error) {
        console.error('Edit candidate error:', error);
        showAlert('Error loading candidate details', 'error');
    }
}

// Edit candidate form submit
function handleEditCandidateFormSubmit(e) {
    e.preventDefault(); // Prevent default form submission
    console.log('Edit form submitted');

    const id = document.getElementById('editCandidateId').value;
    const name = document.getElementById('editName').value.trim();
    const entry = document.getElementById('editEntry').value.trim();
    const board = document.getElementById('editBoard').value.trim();
    const status = document.getElementById('editStatus').value;

    if (!name || !entry || !board) {
        showAlert('Please fill all required fields', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('entry', entry);
    formData.append('board', board);
    formData.append('status', status);

    // Add image only if changed
    if (currentEditImageFile) {
        formData.append('img', currentEditImageFile);
    }

    // Show loading state
    const updateBtnText = document.getElementById('updateBtnText');
    const updateSpinner = document.getElementById('updateSpinner');
    const updateCandidateBtn = document.getElementById('updateCandidateBtn');

    updateBtnText.textContent = 'Updating...';
    updateSpinner.classList.remove('d-none');
    updateCandidateBtn.disabled = true;

    fetch(`${API_BASE_URL}/api/updateCandidate/${id}`, {
        method: 'PUT',
        body: formData
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(result => {
            console.log('Update response:', result);

            // Check different response formats
            if (result.success || result.message === 'Candidate updated successfully') {
                showAlert('Candidate updated successfully!', 'success');
                $('#editCandidateModal').modal('hide'); // FIX: Modal close
                resetEditForm();
                loadCandidates(); // FIX: Auto reload
            } else {
                throw new Error(result.message || result.error || 'Failed to update candidate');
            }
        })
        .catch(error => {
            console.error('Update candidate error:', error);
            showAlert(error.message, 'error');
        })
        .finally(() => {
            // Reset button state
            updateBtnText.textContent = 'Update Candidate';
            updateSpinner.classList.add('d-none');
            updateCandidateBtn.disabled = false;
        });
}

// Delete Candidate
async function deleteCandidate(id) {
    if (!confirm('Are you sure you want to delete this candidate?')) {
        return;
    }

    try {
        console.log('Deleting candidate:', id);
        const response = await fetch(`${API_BASE_URL}/api/deleteCandidate/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('Delete response:', result);

        // Check different response formats
        if (result.success || result.message === 'Candidate deleted successfully') {
            showAlert('Candidate deleted successfully!', 'success');
            loadCandidates(); // FIX: Auto reload
        } else {
            throw new Error(result.message || result.error || 'Failed to delete candidate');
        }
    } catch (error) {
        console.error('Delete candidate error:', error);
        showAlert(error.message, 'error');
    }
}

// Reset Forms
function resetAddForm() {
    console.log('Resetting add form...');

    document.getElementById('name').value = '';
    document.getElementById('entry').value = '';
    document.getElementById('board').value = '';
    document.getElementById('status').value = 'active';

    const imagePreview = document.getElementById('imagePreview');
    const imageUploadArea = document.getElementById('imageUploadArea');
    const imageInput = document.getElementById('imageInput');

    if (imagePreview) {
        imagePreview.style.display = 'none';
        imagePreview.src = '';
    }

    if (imageUploadArea) {
        imageUploadArea.style.display = 'flex';
    }

    if (imageInput) {
        imageInput.value = '';
    }

    currentImageFile = null;
    console.log('Add form reset complete');
}

function resetEditForm() {
    console.log('Resetting edit form...');

    const editImagePreview = document.getElementById('editImagePreview');
    const editImageUploadArea = document.getElementById('editImageUploadArea');
    const editImageInput = document.getElementById('editImageInput');

    if (editImagePreview) {
        editImagePreview.style.display = 'none';
        editImagePreview.src = '';
    }

    if (editImageUploadArea) {
        editImageUploadArea.style.display = 'flex';
    }

    if (editImageInput) {
        editImageInput.value = '';
    }

    currentEditImageFile = null;
    console.log('Edit form reset complete');
}

// Show Alert
function showAlert(message, type = 'success') {
    // Remove existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }

    // Create alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    alert.style.backgroundColor = type === 'success' ? '#155724' : '#721c24';
    alert.style.borderColor = type === 'success' ? '#c3e6cb' : '#f5c6cb';
    alert.style.color = 'white';

    alert.innerHTML = `
        <strong>${type === 'success' ? 'Success!' : 'Error!'}</strong> ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    document.body.appendChild(alert);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (alert.parentNode) {
            alert.remove();
        }
    }, 3000);
}

// Check authentication
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '../admin.html';
    }
}

// Initialize on page load
function initialize() {
    console.log('Candidate Management Initializing...');

    checkAuth();
    setupImageUploadHandlers();
    loadCandidates();

    // Reset forms when modal is closed
    $('#addCandidateModal').on('hidden.bs.modal', resetAddForm);
    $('#editCandidateModal').on('hidden.bs.modal', resetEditForm);

    // Add form event listeners
    const addCandidateForm = document.getElementById('addCandidateForm');
    if (addCandidateForm) {
        addCandidateForm.addEventListener('submit', handleAddCandidateFormSubmit);
        console.log('Add form event listener added');
    } else {
        console.error('Add form not found!');
    }

    const editCandidateForm = document.getElementById('editCandidateForm');
    if (editCandidateForm) {
        editCandidateForm.addEventListener('submit', handleEditCandidateFormSubmit);
        console.log('Edit form event listener added');
    } else {
        console.error('Edit form not found!');
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = '../admin.html';
        });
    }

    // Debug info
    console.log('Form elements check:');
    console.log('Add form exists:', !!document.getElementById('addCandidateForm'));
    console.log('Edit form exists:', !!document.getElementById('editCandidateForm'));
    console.log('Image input exists:', !!document.getElementById('imageInput'));
    console.log('Image upload area exists:', !!document.getElementById('imageUploadArea'));
}

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}

// Make functions globally available for onclick attributes
window.editCandidate = editCandidate;
window.deleteCandidate = deleteCandidate;