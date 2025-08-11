from flask import render_template, request, redirect, url_for, flash, jsonify, send_file
import json
import uuid
from datetime import datetime, timezone
import csv
import io
import pandas as pd
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

# Import app and models after Flask imports to avoid circular imports
from app import app, db
from models import Form, Submission

@app.route('/')
def index():
    """Landing page"""
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    """Main dashboard showing all forms"""
    forms = Form.query.filter_by(is_active=True).order_by(Form.created_at.desc()).all()
    return render_template('dashboard.html', forms=forms)

@app.route('/form/new')
def new_form():
    """Create new form page"""
    return render_template('form_builder.html')

@app.route('/form/create', methods=['POST'])
def create_form():
    """Handle form creation"""
    try:
        data = request.get_json()
        
        form = Form(
            title=data.get('title', 'Untitled Form'),
            description=data.get('description', ''),
            form_uuid=str(uuid.uuid4())
        )
        
        # Set form fields configuration
        form.set_fields(data.get('fields', []))
        
        db.session.add(form)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'form_id': form.id,
            'form_uuid': form.form_uuid,
            'share_url': url_for('view_form', form_uuid=form.form_uuid, _external=True)
        })
    
    except Exception as e:
        app.logger.error(f"Error creating form: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/form/<form_uuid>')
def view_form(form_uuid):
    """Display form for submission"""
    form = Form.query.filter_by(form_uuid=form_uuid, is_active=True).first_or_404()
    return render_template('form_view.html', form=form)

@app.route('/form/<form_uuid>/submit', methods=['POST'])
def submit_form(form_uuid):
    """Handle form submission"""
    form = Form.query.filter_by(form_uuid=form_uuid, is_active=True).first_or_404()
    
    try:
        # Get form data
        form_data = {}
        for field in form.get_fields():
            field_name = field.get('name')
            if field_name:
                form_data[field_name] = request.form.get(field_name, '')
        
        # Create submission
        submission = Submission(
            form_id=form.id,
            ip_address=request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
            user_agent=request.headers.get('User-Agent', '')
        )
        submission.set_data(form_data)
        
        db.session.add(submission)
        db.session.commit()
        
        flash('Form submitted successfully!', 'success')
        return redirect(url_for('view_form', form_uuid=form_uuid))
    
    except Exception as e:
        app.logger.error(f"Error submitting form: {str(e)}")
        flash('Error submitting form. Please try again.', 'error')
        return redirect(url_for('view_form', form_uuid=form_uuid))

@app.route('/form/<int:form_id>/manage')
def manage_form(form_id):
    """Manage form page with submissions"""
    form = Form.query.get_or_404(form_id)
    submissions = Submission.query.filter_by(form_id=form_id).order_by(Submission.submitted_at.desc()).all()
    return render_template('dashboard.html', form=form, submissions=submissions)

@app.route('/submission/<int:submission_id>')
def view_submission(submission_id):
    """View individual submission details"""
    submission = Submission.query.get_or_404(submission_id)
    return render_template('submission_detail.html', submission=submission)

@app.route('/form/<int:form_id>/analytics')
def form_analytics(form_id):
    """Display form analytics"""
    form = Form.query.get_or_404(form_id)
    submissions = Submission.query.filter_by(form_id=form_id).all()
    
    # Prepare analytics data
    analytics_data = {
        'total_submissions': len(submissions),
        'completion_rate': form.get_completion_rate(),
        'submissions_by_date': {},
        'field_analytics': {}
    }
    
    # Group submissions by date
    for submission in submissions:
        date_key = submission.submitted_at.strftime('%Y-%m-%d')
        analytics_data['submissions_by_date'][date_key] = analytics_data['submissions_by_date'].get(date_key, 0) + 1
    
    # Analyze field data
    for field in form.get_fields():
        field_name = field.get('name')
        if field_name:
            field_values = []
            for submission in submissions:
                data = submission.get_data()
                if field_name in data and data[field_name]:
                    field_values.append(data[field_name])
            
            analytics_data['field_analytics'][field_name] = {
                'response_count': len(field_values),
                'response_rate': (len(field_values) / len(submissions) * 100) if submissions else 0,
                'values': field_values
            }
    
    return render_template('analytics.html', form=form, analytics=analytics_data)

@app.route('/form/<int:form_id>/export/<format>')
def export_submissions(form_id, format):
    """Export form submissions in various formats"""
    form = Form.query.get_or_404(form_id)
    submissions = Submission.query.filter_by(form_id=form_id).all()
    
    if format == 'csv':
        return export_csv(form, submissions)
    elif format == 'json':
        return export_json(form, submissions)
    elif format == 'pdf':
        return export_pdf(form, submissions)
    else:
        flash('Invalid export format', 'error')
        return redirect(url_for('manage_form', form_id=form_id))

def export_csv(form, submissions):
    """Export submissions as CSV"""
    output = io.StringIO()
    
    # Get all field names
    field_names = ['Submission ID', 'Submitted At']
    for field in form.get_fields():
        if field.get('name'):
            field_names.append(field.get('label', field.get('name')))
    
    writer = csv.writer(output)
    writer.writerow(field_names)
    
    # Write submission data
    for submission in submissions:
        row = [submission.id, submission.submitted_at.strftime('%Y-%m-%d %H:%M:%S')]
        data = submission.get_data()
        
        for field in form.get_fields():
            field_name = field.get('name')
            if field_name:
                row.append(data.get(field_name, ''))
        
        writer.writerow(row)
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'{form.title}_submissions.csv'
    )

def export_json(form, submissions):
    """Export submissions as JSON"""
    export_data = {
        'form': {
            'id': form.id,
            'title': form.title,
            'description': form.description,
            'created_at': form.created_at.isoformat(),
            'fields': form.get_fields()
        },
        'submissions': []
    }
    
    for submission in submissions:
        export_data['submissions'].append({
            'id': submission.id,
            'submitted_at': submission.submitted_at.isoformat(),
            'data': submission.get_data()
        })
    
    json_data = json.dumps(export_data, indent=2)
    return send_file(
        io.BytesIO(json_data.encode('utf-8')),
        mimetype='application/json',
        as_attachment=True,
        download_name=f'{form.title}_submissions.json'
    )

def export_pdf(form, submissions):
    """Export submissions as PDF"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Title
    title = Paragraph(f"Form Submissions: {form.title}", styles['Title'])
    story.append(title)
    story.append(Spacer(1, 12))
    
    # Form info
    info = Paragraph(f"Description: {form.description or 'No description'}", styles['Normal'])
    story.append(info)
    story.append(Paragraph(f"Total Submissions: {len(submissions)}", styles['Normal']))
    story.append(Spacer(1, 20))
    
    # Submissions table
    if submissions:
        # Create table headers
        headers = ['ID', 'Date']
        for field in form.get_fields():
            if field.get('name'):
                headers.append(field.get('label', field.get('name')))
        
        table_data = [headers]
        
        # Add submission data
        for submission in submissions:
            row = [str(submission.id), submission.submitted_at.strftime('%Y-%m-%d')]
            data = submission.get_data()
            
            for field in form.get_fields():
                field_name = field.get('name')
                if field_name:
                    row.append(str(data.get(field_name, '')))
            
            table_data.append(row)
        
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(table)
    else:
        story.append(Paragraph("No submissions found.", styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    
    return send_file(
        buffer,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'{form.title}_submissions.pdf'
    )

@app.route('/form/<int:form_id>/delete', methods=['POST'])
def delete_form(form_id):
    """Delete a form"""
    form = Form.query.get_or_404(form_id)
    form.is_active = False
    db.session.commit()
    flash('Form deleted successfully!', 'success')
    return redirect(url_for('dashboard'))

@app.route('/form/<int:form_id>/duplicate', methods=['POST'])
def duplicate_form(form_id):
    """Duplicate a form"""
    original_form = Form.query.get_or_404(form_id)
    
    new_form = Form(
        title=f"Copy of {original_form.title}",
        description=original_form.description,
        fields_config=original_form.fields_config,
        form_uuid=str(uuid.uuid4())
    )
    
    db.session.add(new_form)
    db.session.commit()
    
    flash('Form duplicated successfully!', 'success')
    return redirect(url_for('dashboard'))
