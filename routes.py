from flask import render_template, request, redirect, url_for, flash, jsonify, send_file, session
from flask_login import login_required, current_user
from app import app, db
from models import User, Form, Submission, ClickEvent
import json
import uuid
from datetime import datetime, timezone
import csv
import io
from werkzeug.security import generate_password_hash
from flask_login import login_user, logout_user

@app.route('/')
def index():
    """Landing page"""
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return render_template('index.html')

@app.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard showing user's forms"""
    forms = Form.query.filter_by(user_id=current_user.id, is_active=True).order_by(Form.created_at.desc()).all()
    
    # Get statistics
    total_forms = len(forms)
    total_submissions = sum(form.get_submission_count() for form in forms)
    total_views = sum(form.views_count for form in forms)
    
    stats = {
        'total_forms': total_forms,
        'total_submissions': total_submissions,
        'total_views': total_views,
        'avg_completion_rate': round(sum(form.get_completion_rate() for form in forms) / total_forms if total_forms > 0 else 0, 1)
    }
    
    return render_template('dashboard.html', forms=forms, stats=stats)

@app.route('/form/new')
@login_required
def new_form():
    """Create new form page"""
    return render_template('form_builder.html')

@app.route('/form/create', methods=['POST'])
@login_required
def create_form():
    """Handle form creation"""
    try:
        data = request.get_json()
        
        form = Form(
            user_id=current_user.id,
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
        db.session.rollback()
        app.logger.error(f"Error creating form: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/track', methods=['POST'])
def track_events():
    """Track user events and clicks"""
    try:
        data = request.get_json()
        events = data.get('events', [])
        
        for event_data in events:
            event = ClickEvent(
                user_id=current_user.id if current_user.is_authenticated else None,
                event_type=event_data.get('type', 'unknown'),
                element_id=event_data.get('data', {}).get('id'),
                element_type=event_data.get('data', {}).get('element'),
                page_url=event_data.get('url'),
                session_id=event_data.get('sessionId'),
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', '')
            )
            event.set_additional_data(event_data.get('data', {}))
            db.session.add(event)
        
        db.session.commit()
        return jsonify({'success': True, 'tracked': len(events)})
    
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"Error tracking events: {str(e)}")
        return jsonify({'success': False, 'error': 'Failed to track events'}), 500

@app.route('/form/<form_uuid>')
def view_form(form_uuid):
    """Display form for submission"""
    form = Form.query.filter_by(form_uuid=form_uuid, is_active=True).first_or_404()
    
    # Track form view
    form.increment_views()
    
    # Track click event
    session_id = session.get('session_id', str(uuid.uuid4()))
    session['session_id'] = session_id
    
    click_event = ClickEvent(
        form_id=form.id,
        event_type='form_view',
        page_url=request.url,
        session_id=session_id,
        ip_address=request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
        user_agent=request.headers.get('User-Agent', '')
    )
    
    try:
        db.session.add(click_event)
        db.session.commit()
    except Exception as e:
        app.logger.error(f"Error tracking click event: {str(e)}")
    
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
@login_required
def manage_form(form_id):
    """Manage form page with submissions"""
    form = Form.query.filter_by(id=form_id, user_id=current_user.id).first_or_404()
    submissions = Submission.query.filter_by(form_id=form_id).order_by(Submission.submitted_at.desc()).all()
    return render_template('form_manage.html', form=form, submissions=submissions)

@app.route('/submission/<int:submission_id>')
@login_required
def view_submission(submission_id):
    """View individual submission details"""
    submission = Submission.query.join(Form).filter(
        Submission.id == submission_id,
        Form.user_id == current_user.id
    ).first_or_404()
    return render_template('submission_detail.html', submission=submission)

@app.route('/form/<int:form_id>/analytics')
@login_required
def form_analytics(form_id):
    """Display form analytics"""
    form = Form.query.filter_by(id=form_id, user_id=current_user.id).first_or_404()
    submissions = Submission.query.filter_by(form_id=form_id).all()
    click_events = ClickEvent.query.filter_by(form_id=form_id).all()
    
    # Prepare analytics data
    analytics_data = {
        'total_submissions': len(submissions),
        'completion_rate': form.get_completion_rate(),
        'total_views': form.views_count,
        'submissions_by_date': {},
        'field_analytics': {},
        'click_events_by_type': {}
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
    
    # Analyze click events
    for event in click_events:
        event_type = event.event_type
        analytics_data['click_events_by_type'][event_type] = analytics_data['click_events_by_type'].get(event_type, 0) + 1
    
    return render_template('analytics.html', form=form, analytics=analytics_data)

@app.route('/form/<int:form_id>/export/<format>')
@login_required
def export_submissions(form_id, format):
    """Export form submissions in various formats"""
    form = Form.query.filter_by(id=form_id, user_id=current_user.id).first_or_404()
    submissions = Submission.query.filter_by(form_id=form_id).all()
    
    if format == 'csv':
        return export_csv(form, submissions)
    elif format == 'json':
        return export_json(form, submissions)
    else:
        flash('Invalid export format', 'error')
        return redirect(url_for('form_analytics', form_id=form_id))

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

@app.route('/form/<int:form_id>/delete', methods=['POST'])
@login_required
def delete_form(form_id):
    """Delete a form"""
    form = Form.query.filter_by(id=form_id, user_id=current_user.id).first_or_404()
    form.is_active = False
    db.session.commit()
    flash('Form deleted successfully!', 'success')
    return redirect(url_for('dashboard'))

@app.route('/form/<int:form_id>/duplicate', methods=['POST'])
@login_required
def duplicate_form(form_id):
    """Duplicate a form"""
    original_form = Form.query.filter_by(id=form_id, user_id=current_user.id).first_or_404()
    
    new_form = Form(
        user_id=current_user.id,
        title=f"Copy of {original_form.title}",
        description=original_form.description,
        fields_config=original_form.fields_config,
        form_uuid=str(uuid.uuid4())
    )
    
    db.session.add(new_form)
    db.session.commit()
    
    flash('Form duplicated successfully!', 'success')
    return redirect(url_for('dashboard'))

# Click tracking endpoint
@app.route('/api/track-click', methods=['POST'])
def track_click():
    """Track click events for analytics"""
    try:
        data = request.get_json()
        
        session_id = session.get('session_id', str(uuid.uuid4()))
        session['session_id'] = session_id
        
        click_event = ClickEvent(
            user_id=current_user.id if current_user.is_authenticated else None,
            form_id=data.get('form_id'),
            event_type=data.get('event_type', 'click'),
            element_id=data.get('element_id'),
            element_type=data.get('element_type'),
            page_url=data.get('page_url', request.referrer),
            session_id=session_id,
            ip_address=request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr),
            user_agent=request.headers.get('User-Agent', '')
        )
        
        if data.get('additional_data'):
            click_event.set_additional_data(data['additional_data'])
        
        db.session.add(click_event)
        db.session.commit()
        
        return jsonify({'success': True})
    
    except Exception as e:
        app.logger.error(f"Error tracking click: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
