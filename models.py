from app import db
from datetime import datetime, timezone
import json
import uuid
from sqlalchemy import Text, DateTime

class Form(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(Text)
    form_uuid = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    fields_config = db.Column(Text)  # JSON string of form fields configuration
    created_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active = db.Column(db.Boolean, default=True)
    
    # Relationships
    submissions = db.relationship('Submission', backref='form', lazy=True, cascade='all, delete-orphan')
    
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
        return len(self.submissions)
    
    def get_completion_rate(self):
        """Calculate form completion rate (placeholder for now)"""
        total_submissions = self.get_submission_count()
        if total_submissions == 0:
            return 0
        # For now, assume all submissions are completed
        # In a real scenario, you'd track form views vs submissions
        return 100.0

class Submission(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    form_id = db.Column(db.Integer, db.ForeignKey('form.id'), nullable=False)
    submission_data = db.Column(Text)  # JSON string of submitted data
    submitted_at = db.Column(DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address = db.Column(db.String(45))  # Support IPv6
    user_agent = db.Column(db.String(500))
    
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
