// Dashboard JavaScript functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize tooltips
    initializeTooltips();
    
    // Set up real-time updates
    setupSubmissionUpdates();
});

function initializeTooltips() {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function(tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });
}

function copyShareLink(url) {
    navigator.clipboard.writeText(url).then(function() {
        // Show success message
        showToast('Share link copied to clipboard!', 'success');
    }).catch(function() {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Share link copied to clipboard!', 'success');
    });
}

function viewSubmission(submissionId) {
    // Show loading state
    const modal = document.getElementById('submissionModal');
    const modalBody = document.getElementById('submissionDetails');
    
    modalBody.innerHTML = `
        <div class="text-center py-3">
            <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="mt-2 text-muted">Loading submission details...</p>
        </div>
    `;
    
    const submissionModal = new bootstrap.Modal(modal);
    submissionModal.show();
    
    // Fetch submission details
    fetch(`/submission/${submissionId}`)
        .then(response => response.text())
        .then(html => {
            // Parse the HTML to extract just the submission details
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const submissionContent = doc.querySelector('.card .card-body');
            
            if (submissionContent) {
                modalBody.innerHTML = submissionContent.outerHTML;
            } else {
                modalBody.innerHTML = `
                    <div class="alert alert-danger">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        Failed to load submission details.
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error loading submission:', error);
            modalBody.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Failed to load submission details. Please try again.
                </div>
            `;
        });
}

function deleteForm(formId) {
    if (!confirm('Are you sure you want to delete this form? This action cannot be undone.')) {
        return;
    }
    
    fetch(`/form/${formId}/delete`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            showToast('Form deleted successfully!', 'success');
            // Remove the form card from the DOM
            const formCard = document.querySelector(`[data-form-id="${formId}"]`);
            if (formCard) {
                formCard.remove();
            }
            
            // Reload page after a short delay
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast('Failed to delete form. Please try again.', 'error');
        }
    })
    .catch(error => {
        console.error('Error deleting form:', error);
        showToast('Failed to delete form. Please try again.', 'error');
    });
}

function duplicateForm(formId) {
    // Show loading state
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;
    
    fetch(`/form/${formId}/duplicate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            showToast('Form duplicated successfully!', 'success');
            // Reload page to show the duplicated form
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showToast('Failed to duplicate form. Please try again.', 'error');
        }
    })
    .catch(error => {
        console.error('Error duplicating form:', error);
        showToast('Failed to duplicate form. Please try again.', 'error');
    })
    .finally(() => {
        // Restore button state
        button.innerHTML = originalText;
        button.disabled = false;
    });
}

function showToast(message, type = 'info') {
    // Create toast element
    const toastContainer = getOrCreateToastContainer();
    const toastId = 'toast_' + Date.now();
    
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center text-bg-${type === 'error' ? 'danger' : type} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="fas fa-${getToastIcon(type)} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Show toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: type === 'error' ? 5000 : 3000
    });
    
    toast.show();
    
    // Remove toast element after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

function getOrCreateToastContainer() {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container position-fixed top-0 end-0 p-3';
        container.style.zIndex = '9999';
        document.body.appendChild(container);
    }
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-triangle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

function setupSubmissionUpdates() {
    // Placeholder for real-time submission updates
    // This could be implemented with WebSockets or periodic polling
    console.log('Real-time submission updates would be implemented here');
}

// Form search and filtering
function filterForms() {
    const searchTerm = document.getElementById('formSearch').value.toLowerCase();
    const formCards = document.querySelectorAll('.form-card');
    
    formCards.forEach(card => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const description = card.querySelector('.card-text').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Export handling
function exportFormData(formId, format) {
    window.location.href = `/form/${formId}/export/${format}`;
}

// Quick actions
function quickPreview(formUuid) {
    window.open(`/form/${formUuid}`, '_blank', 'width=800,height=600');
}

function quickEdit(formId) {
    // This would redirect to the form builder with the form loaded for editing
    // For now, just show a message
    showToast('Form editing will be implemented in a future update', 'info');
}

// Statistics refresh
function refreshStats() {
    showToast('Refreshing statistics...', 'info');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + N: New form
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        window.location.href = '/form/new';
    }
    
    // Ctrl/Cmd + R: Refresh
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshStats();
    }
});

// Add hover effects and animations
document.addEventListener('DOMContentLoaded', function() {
    // Add smooth transitions to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        card.style.transition = 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out';
    });
    
    // Add loading states to buttons
    const actionButtons = document.querySelectorAll('[data-action]');
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (!this.disabled) {
                const originalText = this.innerHTML;
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                this.disabled = true;
                
                // Reset after 3 seconds if not manually reset
                setTimeout(() => {
                    if (this.disabled) {
                        this.innerHTML = originalText;
                        this.disabled = false;
                    }
                }, 3000);
            }
        });
    });
});
