# Vercel Deployment Guide for FormBuilder

## Prerequisites

1. **Neon PostgreSQL Database**: Ensure you have your Neon database URL ready
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Git Repository**: Your code needs to be in a Git repository (GitHub, GitLab, etc.)

## Environment Variables Setup

In your Vercel project settings, add these environment variables:

```
DATABASE_URL=your_neon_postgresql_connection_string
SESSION_SECRET=your_secure_random_session_key
FLASK_ENV=production
```

### Important Database URL Format

Ensure your Neon PostgreSQL URL follows this format:
```
postgresql://username:password@hostname:port/database?sslmode=require
```

The app automatically handles `postgres://` to `postgresql://` URL conversion for compatibility.

## Deployment Steps

1. **Push to Git Repository**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Log in to Vercel dashboard
   - Click "New Project"
   - Import your Git repository
   - Vercel will auto-detect it as a Python project

3. **Configure Build Settings**
   - Build Command: Leave empty (auto-detected)
   - Output Directory: Leave empty
   - Install Command: `pip install -r requirements-vercel.txt`

4. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all the variables listed above

5. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your app automatically

## File Structure for Vercel

The app is configured with these key files:

- `vercel.json`: Deployment configuration
- `api/index.py`: Serverless function entry point
- `main.py`: Flask app entry point
- `.env.example`: Template for environment variables

## Database Initialization

The app automatically creates database tables on first deployment. The PostgreSQL database from Neon will be initialized with the required schema.

## Testing Your Deployment

1. Visit your Vercel deployment URL
2. Test form creation functionality
3. Test form submission and analytics
4. Verify database connectivity

## Production Considerations

1. **Security**: Ensure SESSION_SECRET is a strong, random string
2. **Database**: Use connection pooling for better performance (already configured)
3. **Monitoring**: Enable Vercel function logs for debugging
4. **SSL**: All Vercel deployments come with HTTPS by default

## Troubleshooting

- **Database Connection Issues**: Verify your DATABASE_URL format
- **Build Errors**: Check that `requirements-vercel.txt` contains all needed packages
- **Vercel Config Error**: The error "functions property cannot be used with builds" has been fixed
- **Session Issues**: Verify SESSION_SECRET is set correctly  
- **Static Files**: Static files are served automatically by Vercel

## Common Deployment Errors Fixed

1. **"The functions property cannot be used in conjunction with the builds property"**
   - Solution: Removed `functions` section from vercel.json, keeping only `builds`

2. **Database initialization issues**
   - Solution: Added proper error handling in database initialization

## Custom Domain (Optional)

To use a custom domain:
1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed by Vercel