import json
from datetime import datetime, timezone

def validate_form_fields(fields):
    """Validate form field configuration"""
    if not isinstance(fields, list):
        return False, "Fields must be a list"
    
    required_field_types = ['text', 'email', 'textarea', 'select', 'radio', 'checkbox', 'number', 'date']
    
    for field in fields:
        if not isinstance(field, dict):
            return False, "Each field must be a dictionary"
        
        if 'type' not in field:
            return False, "Each field must have a type"
        
        if field['type'] not in required_field_types:
            return False, f"Invalid field type: {field['type']}"
        
        if 'name' not in field or not field['name']:
            return False, "Each field must have a name"
    
    return True, "Valid"

def sanitize_field_name(name):
    """Sanitize field name to be safe for HTML"""
    import re
    # Remove special characters and replace with underscores
    sanitized = re.sub(r'[^a-zA-Z0-9_]', '_', name)
    # Ensure it starts with a letter
    if sanitized and not sanitized[0].isalpha():
        sanitized = 'field_' + sanitized
    return sanitized or 'unnamed_field'

def format_datetime(dt):
    """Format datetime for display"""
    if isinstance(dt, datetime):
        return dt.strftime('%Y-%m-%d %H:%M:%S')
    return str(dt)

def get_field_type_display_name(field_type):
    """Get human-readable field type name"""
    type_names = {
        'text': 'Text Input',
        'email': 'Email Input',
        'textarea': 'Text Area',
        'select': 'Dropdown',
        'radio': 'Radio Buttons',
        'checkbox': 'Checkboxes',
        'number': 'Number Input',
        'date': 'Date Input'
    }
    return type_names.get(field_type, field_type.title())
