import os
import logging
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from werkzeug.middleware.proxy_fix import ProxyFix

# Configure logging
logging.basicConfig(level=logging.DEBUG)

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)

# create the app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "dev-secret-key-change-in-production")
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

# configure the database - prioritize DATABASE_URL for production deployment
database_url = os.environ.get("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    # Fix for Heroku/Vercel postgres URLs
    database_url = database_url.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = database_url or "sqlite:///formbuilder.db"
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# initialize the app with the extension
db.init_app(app)

def init_db():
    """Initialize database tables"""
    try:
        with app.app_context():
            # Import models to ensure tables are created
            import models  # noqa: F401
            db.create_all()
            app.logger.info("Database initialized successfully")
    except Exception as e:
        app.logger.error(f"Database initialization failed: {str(e)}")

# Initialize database for production
init_db()

# Import routes
from routes import *  # noqa: F401, F403

# For Vercel deployment
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
