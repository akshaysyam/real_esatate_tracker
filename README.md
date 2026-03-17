# Real Estate Lifestyle & Compliance Tracker

A comprehensive internal tool for tracking real estate project lifecycles by extracting data from government compliance portals (Parivesh) and visualizing site boundaries.

## 🚀 Features

- **Project Management**: Complete CRUD operations for real estate projects
- **KML Processing**: Upload and visualize site boundaries with automatic geocoding
- **File Vault**: Store site plans, project presentations, and conceptual plans
- **Smart Calculations**: Automatic area conversion, floor parsing, and density calculations
- **Interactive Dashboard**: Sortable table with advanced filtering and statistics
- **Zero-Cost Infrastructure**: Uses Firebase (free tier) and OpenStreetMap

## 🛠️ Tech Stack

- **Frontend**: Vite + React 19 + Tailwind CSS
- **Backend**: Firebase (Firestore + Storage)
- **Maps**: Leaflet.js + OpenStreetMap (free)
- **File Processing**: @tmcw/togeojson for KML conversion
- **Geocoding**: Nominatim API (OpenStreetMap)

## 📋 Prerequisites

- Node.js 18+
- Firebase account (free tier)
- Git

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd real_estate_tracker
npm install
```

### 2. Firebase Setup

1. Create a Firebase project at [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Enable **Firestore Database** in test mode
3. Enable **Storage**
4. Go to Project Settings → Your Apps → Web App
5. Copy the Firebase config

### 3. Configure Firebase

Update `src/lib/firebaseConfig.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789012345678",
};
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

## 📊 Core Functionality

### Data Ingestion

- **Metadata Fields**: Builder Name, Alias, Project Type, Location, Date, Application Category
- **Area Input**: Support for Acres + Guntas or Square meters (auto-converted to Acres)
- **Floor Configuration**: Parse strings like "2B+G+18" into sortable floor counts
- **Calculated Fields**: Density (units per acre), total floors above ground

### KML Processing

- Upload .kml files to define site boundaries
- Automatic conversion to GeoJSON using @tmcw/togeojson
- Reverse geocoding via Nominatim to extract human-readable addresses
- Interactive map visualization with Leaflet.js

### File Vault

- **Site Plans**: PDF and image files
- **Project Presentations**: PDF, PPT, PPTX files
- **Conceptual Plans**: PDF files
- **Others**: Any additional documentation
- All files stored in Firebase Storage under `/projects/[projectName]/[category]/`

### Dashboard Features

- **Sortable Columns**: Date, Builder Name, Size (Acres), Density, Floors
- **Statistics**: Total projects, area, units, and unique builders
- **Interactive Details**: Click rows to expand project details and maps
- **File Downloads**: Direct links to uploaded documents

## 🏗️ Architecture

```
src/
├── components/
│   ├── ProjectForm.jsx     # Main project entry form
│   ├── Dashboard.jsx       # sortable table and statistics
│   └── MapView.jsx        # Leaflet map component
├── services/
│   └── projectService.js   # Firebase CRUD operations
├── utils/
│   ├── areaConverter.js   # Area conversion utilities
│   ├── floorParser.js     # Floor configuration parser
│   └── kmlHandler.js      # KML processing and geocoding
└── lib/
    └── firebaseConfig.js  # Firebase configuration
```

## 📝 Data Models

### Project Document Structure

```javascript
{
  builderName: "Sobha Developers",
  builderAlias: "SOBHA",
  projectType: "Residential",
  projectLocation: "Whitefield, Bangalore",
  date: "2024-03-15",
  applicationCategory: "EC",
  areaInAcres: 5.2500,
  totalUnits: 450,
  floorConfig: "2B+G+18",
  parsedFloors: 19,
  density: 85.71,
  geojson: {...},           // KML converted to GeoJSON
  coordinates: { lat: 12.9698, lng: 77.7499 },
  files: {
    sitePlan: { "file.pdf": "https://..." },
    ppt: { "presentation.pptx": "https://..." },
    conceptualPlan: {},
    others: {}
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Initialize Firebase Hosting:

```bash
firebase init hosting
```

3. Deploy:

```bash
firebase deploy --only hosting
```

### Environment Variables

For production, ensure your Firebase configuration is properly secured. Consider using environment variables for sensitive data.

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **New Project Fields**: Update `INITIAL_STATE` in `ProjectForm.jsx`
2. **New File Categories**: Add to file vault section and `projectService.js`
3. **New Sorting Options**: Add to `SORT_OPTIONS` in `Dashboard.jsx`

## 🐛 Troubleshooting

### Common Issues

1. **Firebase Connection Errors**
   - Verify your Firebase configuration
   - Check Firestore and Storage rules
   - Ensure proper network connectivity

2. **KML Upload Issues**
   - Verify file format is valid KML
   - Check file size limits
   - Ensure Nominatim API is accessible

3. **Map Display Problems**
   - Check Leaflet CSS imports
   - Verify GeoJSON data structure
   - Check browser console for errors

### Firebase Security Rules

For development, use these permissive rules (update for production):

```javascript
// Firestore Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}

// Storage Rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

## 📄 License

This project is proprietary and intended for internal use only.

## 🤝 Support

For technical support or feature requests, please contact the development team.
