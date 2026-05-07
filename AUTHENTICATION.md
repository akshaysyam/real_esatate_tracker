# Authentication System Guide

This document explains the authentication and authorization system implemented in the Real Estate Tracker application.

## Features

### 🔐 User Authentication
- **Email/Password Login**: Secure authentication using Firebase Auth
- **User Registration**: New user signup with email verification
- **Password Reset**: Forgot password functionality
- **Session Management**: Persistent login sessions

### 👥 Role-Based Access Control
- **Admin Role**: Full access to all features
  - Create, edit, delete projects
  - User management
  - View version history
  - Access to all navigation items
- **User Role**: Limited access
  - View dashboard and map only
  - Cannot add, edit, or delete projects
  - No access to user management

### 📝 Version History & Audit Trail
- **Automatic Tracking**: All project changes are automatically logged
- **User Attribution**: Each change is linked to the user who made it
- **Change Details**: Before/after values for updates
- **Action Types**: Create, Update, Delete operations tracked

## Setup Instructions

### 1. Firebase Configuration
Ensure your Firebase project has Authentication enabled:
1. Go to Firebase Console → Authentication
2. Enable "Email/Password" sign-in method
3. Update your `.env` file with Firebase config

### 2. Create First Admin User
1. Start the application: `npm run dev`
2. Register a new user account
3. Open browser console (F12)
4. Run the admin setup script:
   ```javascript
   // Import and run the setup function
   import('./src/utils/setupAdmin.js').then(module => {
     window.setupAdmin();
   });
   ```
5. Refresh the page to see admin privileges

### 3. User Roles Management
Admin users can manage other users through the Users section (coming soon).

## File Structure

```
src/
├── contexts/
│   └── AuthContext.jsx          # Authentication state management
├── components/
│   ├── Auth/
│   │   ├── Login.jsx           # Login component
│   │   └── Register.jsx        # Registration component
│   └── ProtectedRoute.jsx       # Route protection wrapper
├── services/
│   ├── userService.js          # User profile management
│   ├── versionService.js       # Version history tracking
│   └── projectService.js       # Updated with versioning
└── utils/
    └── setupAdmin.js          # Admin setup utility
```

## Usage Examples

### Protected Routes
```jsx
import ProtectedRoute from './components/ProtectedRoute';
import { AdminOnly } from './components/ProtectedRoute';

// Only logged-in users
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Only admin users
<AdminOnly>
  <UserManagement />
</AdminOnly>
```

### Authentication Context
```jsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { currentUser, userProfile, isAdmin, logout } = useAuth();
  
  if (isAdmin) {
    // Show admin features
  }
}
```

### Version Tracking
```jsx
import { createVersion } from './services/versionService';

// Automatic versioning is handled in projectService
// Manual tracking:
await createVersion(projectId, userId, 'update', changes, description);
```

## Security Features

### 🔒 Access Control
- Route-level protection
- Component-level role checks
- Server-side validation (Firebase Security Rules recommended)

### 🛡️ Data Protection
- Password hashing (handled by Firebase)
- Secure session management
- Input validation and sanitization

### 📊 Audit Trail
- Complete change history
- User attribution
- Timestamp tracking
- Change details preserved

## Firebase Security Rules (Recommended)

Add these rules to your Firestore database for additional security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects collection
    match /projects/{projectId} {
      // Admins can read/write all projects
      allow read, write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // Users can read all projects
      allow read: if request.auth != null;
    }
    
    // Version history - read-only for users, write-only for system
    match /project_versions/{versionId} {
      allow read: if request.auth != null;
      allow write: if false; // Only system can write
    }
  }
}
```

## Troubleshooting

### Common Issues

1. **"Authentication Required" Error**
   - Ensure you're logged in
   - Check Firebase Auth configuration

2. **"Access Denied" Error**
   - Check user role in Firebase Console
   - Verify role-based access control logic

3. **Version History Not Showing**
   - Ensure userId is passed to project operations
   - Check versionService configuration

### Debug Mode
Enable debug logging by setting `localStorage.setItem('debug', 'true');` in browser console.

## Next Steps

1. **User Management Interface**: Build admin panel for user management
2. **Enhanced Version History**: Create detailed version history viewer
3. **Email Notifications**: Add email alerts for project changes
4. **Two-Factor Authentication**: Add 2FA for enhanced security
5. **API Rate Limiting**: Implement rate limiting for API calls

## Support

For issues or questions about the authentication system:
1. Check browser console for errors
2. Verify Firebase configuration
3. Review this documentation
4. Check Firebase Console for auth status
