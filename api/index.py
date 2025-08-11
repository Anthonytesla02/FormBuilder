# Vercel serverless function entry point
from main import app

# Export the Flask app for Vercel
application = app

if __name__ == "__main__":
    app.run()