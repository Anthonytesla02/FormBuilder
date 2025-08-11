# FormBuilder - Dynamic Form Creation Platform

## Overview

FormBuilder is a web-based form creation and management platform that allows users to create custom forms using a drag-and-drop interface. The application provides comprehensive form building capabilities, submission management, analytics, and data export functionality. Users can create various types of form fields, collect responses, and analyze the collected data through an intuitive dashboard.

## User Preferences

Preferred communication style: Simple, everyday language.
Deployment preference: Vercel with Neon PostgreSQL database.

## Recent Changes

**August 11, 2025 - Vercel Deployment Preparation:**
- Fixed Vercel configuration conflicts (removed functions property from vercel.json)
- Created serverless function entry point (api/index.py) for Vercel
- Added PostgreSQL URL format handling for Neon database compatibility
- Created requirements-vercel.txt for Vercel deployment dependencies
- Added comprehensive deployment guide (DEPLOYMENT.md)
- Fixed database model constructors and initialization
- Added proper error handling for production deployment

## System Architecture

### Backend Architecture
- **Framework**: Flask web framework with SQLAlchemy ORM for database operations
- **Database**: SQLite for development with PostgreSQL support through environment configuration
- **Models**: Two main entities - Forms and Submissions with a one-to-many relationship
- **Session Management**: Flask sessions with configurable secret keys
- **Middleware**: ProxyFix for handling reverse proxy headers

### Database Design
- **Form Model**: Stores form metadata, configuration (JSON), UUID for public access, and timestamps
- **Submission Model**: Stores form responses as JSON data with timestamps and foreign key relationships
- **Field Configuration**: JSON-based storage for dynamic form field definitions supporting text, email, textarea, select, radio, checkbox, number, and date inputs

### Frontend Architecture
- **Template Engine**: Jinja2 templates with Bootstrap dark theme
- **Styling**: Bootstrap CSS framework with custom CSS for form builder interface
- **JavaScript**: Vanilla JavaScript for form building, analytics charts (Chart.js), and interactive features
- **Responsive Design**: Mobile-first approach using Bootstrap grid system

### Form Builder System
- **Dynamic Field Creation**: JavaScript-based drag-and-drop interface for adding form fields
- **Field Types**: Support for 8 different input types with validation and configuration options
- **Real-time Preview**: Live form preview during the building process
- **Field Validation**: Both client-side and server-side validation for form configurations

### Analytics and Reporting
- **Dashboard**: Overview of all forms with submission counts and management options
- **Analytics Views**: Detailed analytics per form including submission trends and completion rates
- **Data Export**: Multiple export formats (CSV, JSON, PDF) for form submissions
- **Chart Integration**: Chart.js for visualizing submission data and trends

### Security and Validation
- **Input Sanitization**: Field name sanitization and validation utilities
- **CSRF Protection**: Flask session-based security measures
- **Data Validation**: Comprehensive validation for form field configurations and submissions

## External Dependencies

### Frontend Libraries
- **Bootstrap**: CSS framework with dark theme support for responsive UI design
- **Chart.js**: JavaScript charting library for analytics visualization
- **Font Awesome**: Icon library for UI elements and navigation

### Python Libraries
- **Flask**: Core web framework for routing and request handling
- **SQLAlchemy**: ORM for database operations and model definitions
- **ReportLab**: PDF generation library for exporting submission reports
- **Pandas**: Data manipulation for analytics and export functionality

### Development Dependencies
- **Werkzeug**: WSGI utilities including ProxyFix middleware for deployment
- **UUID**: Built-in library for generating unique form identifiers

### Infrastructure Requirements
- **Database**: SQLite for development, configurable for PostgreSQL in production
- **File System**: Static file serving for CSS, JavaScript, and other assets
- **Session Storage**: Server-side session management for user state