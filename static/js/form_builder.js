// Form Builder JavaScript
let currentForm = {
    title: 'Untitled Form',
    description: '',
    fields: []
};

let fieldCounter = 0;
let currentEditingField = null;

// Initialize form builder
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sortable for drag and drop
    initializeSortable();
    
    // Set up event listeners
    document.getElementById('formTitle').addEventListener('input', updateFormTitle);
    document.getElementById('formDescription').addEventListener('input', updateFormDescription);
    
    // Generate field name from label
    document.getElementById('fieldLabel').addEventListener('input', function() {
        const label = this.value;
        const nameField = document.getElementById('fieldName');
        if (nameField && !nameField.dataset.manuallyEdited) {
            nameField.value = sanitizeFieldName(label);
        }
    });
    
    // Mark field name as manually edited if user changes it
    document.getElementById('fieldName').addEventListener('input', function() {
        this.dataset.manuallyEdited = 'true';
    });
});

function initializeSortable() {
    const formBuilder = document.getElementById('formBuilder');
    if (formBuilder) {
        // Simple drag and drop implementation
        formBuilder.addEventListener('dragover', handleDragOver);
        formBuilder.addEventListener('drop', handleDrop);
    }
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    // Handle field reordering here
    console.log('Field dropped');
}

function updateFormTitle() {
    currentForm.title = this.value || 'Untitled Form';
}

function updateFormDescription() {
    currentForm.description = this.value;
}

function addField(fieldType) {
    const field = {
        id: `field_${++fieldCounter}`,
        type: fieldType,
        label: `${getFieldTypeDisplayName(fieldType)} Field`,
        name: `field_${fieldCounter}`,
        placeholder: '',
        required: false,
        options: []
    };
    
    // Add options for select, radio, and checkbox fields
    if (['select', 'radio', 'checkbox'].includes(fieldType)) {
        field.options = ['Option 1', 'Option 2'];
    }
    
    currentForm.fields.push(field);
    renderFormBuilder();
    
    // Auto-open configuration modal
    setTimeout(() => editField(field.id), 100);
}

function editField(fieldId) {
    const field = currentForm.fields.find(f => f.id === fieldId);
    if (!field) return;
    
    currentEditingField = field;
    
    // Populate modal fields
    document.getElementById('fieldLabel').value = field.label;
    document.getElementById('fieldName').value = field.name;
    document.getElementById('fieldPlaceholder').value = field.placeholder || '';
    document.getElementById('fieldRequired').checked = field.required;
    
    // Handle options for select/radio/checkbox fields
    const optionsContainer = document.getElementById('fieldOptions');
    const optionsList = document.getElementById('optionsList');
    
    if (['select', 'radio', 'checkbox'].includes(field.type)) {
        optionsContainer.style.display = 'block';
        renderOptions(field.options);
    } else {
        optionsContainer.style.display = 'none';
    }
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('fieldConfigModal'));
    modal.show();
}

function renderOptions(options) {
    const optionsList = document.getElementById('optionsList');
    optionsList.innerHTML = '';
    
    options.forEach((option, index) => {
        const optionDiv = document.createElement('div');
        optionDiv.className = 'input-group mb-2';
        optionDiv.innerHTML = `
            <input type="text" class="form-control" value="${option}" 
                   onchange="updateOption(${index}, this.value)">
            <button class="btn btn-outline-danger" type="button" onclick="removeOption(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        optionsList.appendChild(optionDiv);
    });
}

function addOption() {
    if (currentEditingField && ['select', 'radio', 'checkbox'].includes(currentEditingField.type)) {
        currentEditingField.options.push(`Option ${currentEditingField.options.length + 1}`);
        renderOptions(currentEditingField.options);
    }
}

function updateOption(index, value) {
    if (currentEditingField && currentEditingField.options) {
        currentEditingField.options[index] = value;
    }
}

function removeOption(index) {
    if (currentEditingField && currentEditingField.options) {
        currentEditingField.options.splice(index, 1);
        renderOptions(currentEditingField.options);
    }
}

function saveFieldConfig() {
    if (!currentEditingField) return;
    
    // Update field properties
    currentEditingField.label = document.getElementById('fieldLabel').value;
    currentEditingField.name = document.getElementById('fieldName').value;
    currentEditingField.placeholder = document.getElementById('fieldPlaceholder').value;
    currentEditingField.required = document.getElementById('fieldRequired').checked;
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('fieldConfigModal'));
    modal.hide();
    
    // Re-render form builder
    renderFormBuilder();
    
    currentEditingField = null;
}

function removeField(fieldId) {
    currentForm.fields = currentForm.fields.filter(f => f.id !== fieldId);
    renderFormBuilder();
}

function duplicateField(fieldId) {
    const field = currentForm.fields.find(f => f.id === fieldId);
    if (!field) return;
    
    const duplicatedField = {
        ...field,
        id: `field_${++fieldCounter}`,
        name: `${field.name}_copy`,
        label: `${field.label} (Copy)`
    };
    
    const index = currentForm.fields.findIndex(f => f.id === fieldId);
    currentForm.fields.splice(index + 1, 0, duplicatedField);
    renderFormBuilder();
}

function renderFormBuilder() {
    const formBuilder = document.getElementById('formBuilder');
    
    if (currentForm.fields.length === 0) {
        formBuilder.innerHTML = `
            <div class="text-center text-muted py-5">
                <i class="fas fa-mouse-pointer display-1 mb-3"></i>
                <h4>Start Building Your Form</h4>
                <p>Click on field types in the sidebar to add them to your form</p>
            </div>
        `;
        return;
    }
    
    formBuilder.innerHTML = '';
    
    currentForm.fields.forEach(field => {
        const fieldElement = createFieldElement(field);
        formBuilder.appendChild(fieldElement);
    });
}

function createFieldElement(field) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'form-builder-field';
    fieldDiv.draggable = true;
    fieldDiv.dataset.fieldId = field.id;
    
    fieldDiv.innerHTML = `
        <div class="d-flex justify-content-between align-items-start mb-2">
            <div>
                <h6 class="mb-1">${field.label} ${field.required ? '<span class="text-danger">*</span>' : ''}</h6>
                <small class="text-muted">${getFieldTypeDisplayName(field.type)} • ${field.name}</small>
            </div>
            <div class="field-controls">
                <button class="btn btn-outline-primary btn-sm me-1" onclick="editField('${field.id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-secondary btn-sm me-1" onclick="duplicateField('${field.id}')">
                    <i class="fas fa-copy"></i>
                </button>
                <button class="btn btn-outline-danger btn-sm" onclick="removeField('${field.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="form-field-preview">
            ${renderFieldPreview(field)}
        </div>
    `;
    
    return fieldDiv;
}

function renderFieldPreview(field) {
    switch (field.type) {
        case 'text':
        case 'email':
        case 'number':
            return `<input type="${field.type}" class="form-control" placeholder="${field.placeholder}" disabled>`;
        
        case 'textarea':
            return `<textarea class="form-control" rows="3" placeholder="${field.placeholder}" disabled></textarea>`;
        
        case 'date':
            return `<input type="date" class="form-control" disabled>`;
        
        case 'select':
            const selectOptions = field.options.map(opt => `<option>${opt}</option>`).join('');
            return `<select class="form-select" disabled><option>Choose an option...</option>${selectOptions}</select>`;
        
        case 'radio':
            const radioOptions = field.options.map((opt, index) => 
                `<div class="form-check">
                    <input class="form-check-input" type="radio" disabled>
                    <label class="form-check-label">${opt}</label>
                </div>`
            ).join('');
            return radioOptions;
        
        case 'checkbox':
            const checkboxOptions = field.options.map((opt, index) => 
                `<div class="form-check">
                    <input class="form-check-input" type="checkbox" disabled>
                    <label class="form-check-label">${opt}</label>
                </div>`
            ).join('');
            return checkboxOptions;
        
        default:
            return `<input type="text" class="form-control" placeholder="${field.placeholder}" disabled>`;
    }
}

function getFieldTypeDisplayName(fieldType) {
    const typeNames = {
        'text': 'Text Input',
        'email': 'Email Input',
        'textarea': 'Text Area',
        'select': 'Dropdown',
        'radio': 'Radio Buttons',
        'checkbox': 'Checkboxes',
        'number': 'Number Input',
        'date': 'Date Input'
    };
    return typeNames[fieldType] || fieldType;
}

function sanitizeFieldName(name) {
    return name.toLowerCase()
               .replace(/[^a-zA-Z0-9]/g, '_')
               .replace(/_{2,}/g, '_')
               .replace(/^_|_$/g, '') || 'field';
}

function previewForm() {
    if (currentForm.fields.length === 0) {
        alert('Please add at least one field to preview the form.');
        return;
    }
    
    // Create a temporary form preview
    const previewWindow = window.open('', '_blank', 'width=800,height=600');
    const previewHTML = generateFormPreview();
    previewWindow.document.write(previewHTML);
    previewWindow.document.close();
}

function generateFormPreview() {
    const fieldsHTML = currentForm.fields.map(field => {
        let fieldHTML = `
            <div class="mb-3">
                <label class="form-label">${field.label}${field.required ? ' <span class="text-danger">*</span>' : ''}</label>
        `;
        
        switch (field.type) {
            case 'text':
            case 'email':
            case 'number':
                fieldHTML += `<input type="${field.type}" class="form-control" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}>`;
                break;
            case 'textarea':
                fieldHTML += `<textarea class="form-control" rows="4" placeholder="${field.placeholder}" ${field.required ? 'required' : ''}></textarea>`;
                break;
            case 'date':
                fieldHTML += `<input type="date" class="form-control" ${field.required ? 'required' : ''}>`;
                break;
            case 'select':
                const selectOptions = field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('');
                fieldHTML += `<select class="form-select" ${field.required ? 'required' : ''}><option value="">Choose an option...</option>${selectOptions}</select>`;
                break;
            case 'radio':
                field.options.forEach((opt, index) => {
                    fieldHTML += `
                        <div class="form-check">
                            <input class="form-check-input" type="radio" name="${field.name}" value="${opt}" ${field.required ? 'required' : ''}>
                            <label class="form-check-label">${opt}</label>
                        </div>
                    `;
                });
                break;
            case 'checkbox':
                field.options.forEach((opt, index) => {
                    fieldHTML += `
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="${field.name}" value="${opt}">
                            <label class="form-check-label">${opt}</label>
                        </div>
                    `;
                });
                break;
        }
        
        fieldHTML += '</div>';
        return fieldHTML;
    }).join('');
    
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Form Preview - ${currentForm.title}</title>
            <link href="https://cdn.replit.com/agent/bootstrap-agent-dark-theme.min.css" rel="stylesheet">
        </head>
        <body data-bs-theme="dark">
            <div class="container py-4">
                <div class="card">
                    <div class="card-header bg-primary text-white">
                        <h3>${currentForm.title}</h3>
                        ${currentForm.description ? `<p class="mb-0">${currentForm.description}</p>` : ''}
                    </div>
                    <div class="card-body">
                        <form>
                            ${fieldsHTML}
                            <button type="submit" class="btn btn-primary">Submit Form</button>
                        </form>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;
}

function saveForm() {
    if (currentForm.fields.length === 0) {
        alert('Please add at least one field before saving the form.');
        return;
    }
    
    // Validate form configuration
    const validation = validateFormConfig();
    if (!validation.valid) {
        alert(validation.message);
        return;
    }
    
    // Show loading state
    const saveButton = document.querySelector('button[onclick="saveForm()"]');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Saving...';
    saveButton.disabled = true;
    
    // Send form data to server
    fetch('/form/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(currentForm)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success modal
            document.getElementById('shareLink').value = data.share_url;
            document.getElementById('viewFormLink').href = data.share_url;
            
            const successModal = new bootstrap.Modal(document.getElementById('successModal'));
            successModal.show();
        } else {
            alert('Error creating form: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error creating form. Please try again.');
    })
    .finally(() => {
        // Restore button state
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    });
}

function validateFormConfig() {
    if (!currentForm.title.trim()) {
        return { valid: false, message: 'Please enter a form title.' };
    }
    
    for (let field of currentForm.fields) {
        if (!field.label.trim()) {
            return { valid: false, message: 'All fields must have a label.' };
        }
        
        if (!field.name.trim()) {
            return { valid: false, message: 'All fields must have a name.' };
        }
        
        if (['select', 'radio', 'checkbox'].includes(field.type) && (!field.options || field.options.length === 0)) {
            return { valid: false, message: `Field "${field.label}" must have at least one option.` };
        }
    }
    
    return { valid: true };
}

function copyShareLink() {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);
    
    navigator.clipboard.writeText(shareLink.value).then(function() {
        // Show success feedback
        const button = event.target.closest('button');
        const originalHTML = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i>';
        button.classList.remove('btn-outline-secondary');
        button.classList.add('btn-success');
        
        setTimeout(() => {
            button.innerHTML = originalHTML;
            button.classList.remove('btn-success');
            button.classList.add('btn-outline-secondary');
        }, 2000);
    }).catch(function() {
        alert('Could not copy link. Please copy manually.');
    });
}
