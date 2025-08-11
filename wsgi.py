# WSGI entry point for Vercel deployment
from app import app

# This is what Vercel will use
application = app

if __name__ == "__main__":
    app.run()