from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone
import json
import uuid
from sqlalchemy import Text, DateTime, ForeignKey

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    forms = db.relationship('Form', backref='owner', lazy=True, cascade='all, delete-orphan')
    click_events = db.relationship('ClickEvent', backref='user', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def get_full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.email.split('@')[0]
    
    def get_total_forms(self):
        return db.session.query(Form).filter_by(user_id=self.id, is_active=True).count()
    
    def get_total_submissions(self):
        return db.session.query(Submission).join(Form).filter(Form.user_id == self.id).count()

class Form(db.Model):
    __tablename__ = 'forms'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(Text)
    form_uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    fields_config = db.Column(Text)  # JSON string of form fields configuration
    created_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active = db.Column(db.Boolean, default=True)
    views_count = db.Column(db.Integer, default=0)
    
    # Relationships
    submissions = db.relationship('Submission', backref='form', lazy=True, cascade='all, delete-orphan')
    click_events = db.relationship('ClickEvent', backref='form', lazy=True)
    
    def get_fields(self):
        """Parse and return form fields from JSON configuration"""
        if self.fields_config:
            try:
                return json.loads(self.fields_config)
            except json.JSONDecodeError:
                return []
        return []
    
    def set_fields(self, fields):
        """Set form fields as JSON configuration"""
        self.fields_config = json.dumps(fields)
    
    def get_submission_count(self):
        """Get total number of submissions for this form"""
        return db.session.query(Submission).filter_by(form_id=self.id).count()
    
    def get_completion_rate(self):
        """Calculate form completion rate based on views vs submissions"""
        if self.views_count == 0:
            return 0
        return round((self.get_submission_count() / self.views_count) * 100, 1)
    
    def increment_views(self):
        """Increment form view count"""
        self.views_count += 1
        db.session.commit()

class Submission(db.Model):
    __tablename__ = 'submissions'
    
    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.Integer, ForeignKey('forms.id'), nullable=False)
    submission_data = db.Column(Text)  # JSON string of submitted data
    submitted_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = db.Column(db.String(45))  # Support IPv6
    user_agent = db.Column(db.String(500))
    referrer = db.Column(db.String(500))
    session_id = db.Column(db.String(100))
    
    def get_data(self):
        """Parse and return submission data from JSON"""
        if self.submission_data:
            try:
                return json.loads(self.submission_data)
            except json.JSONDecodeError:
                return {}
        return {}
    
    def set_data(self, data):
        """Set submission data as JSON"""
        self.submission_data = json.dumps(data)

class ClickEvent(db.Model):
    __tablename__ = 'click_events'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, ForeignKey('users.id'), nullable=True)
    form_id = db.Column(db.Integer, ForeignKey('forms.id'), nullable=True)
    event_type = db.Column(db.String(50), nullable=False)  # 'form_view', 'field_click', 'submit_attempt', etc.
    element_id = db.Column(db.String(100))
    element_type = db.Column(db.String(50))
    page_url = db.Column(db.String(500))
    timestamp = db.Column(DateTime, default=lambda: datetime.now(timezone.utc))
    session_id = db.Column(db.String(100))
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    additional_data = db.Column(Text)  # JSON for any extra tracking data
    
    def set_additional_data(self, data):
        """Set additional tracking data as JSON"""
        self.additional_data = json.dumps(data)
    
    def get_additional_data(self):
        """Parse and return additional tracking data from JSON"""
        if self.additional_data:
            try:
                return json.loads(self.additional_data)
            except json.JSONDecodeError:
                return {}
        return {}
