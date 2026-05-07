import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// ⚠️  REPLACE with your Firebase project config
// Firebase Console → Project Settings → Your Apps → SDK setup
// Create a new Firebase project at https://console.firebase.google.com/
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate that all required Firebase config variables are present
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_APP_ID",
];

const missingVars = requiredEnvVars.filter(
  (varName) => !import.meta.env[varName],
);

// In development, show warnings but don't throw errors
if (missingVars.length > 0 && import.meta.env.DEV) {
  console.warn("Missing Firebase environment variables:", missingVars);
  console.warn(
    "Please check your .env file and Firebase project configuration",
  );
  console.warn("Continuing in development mode with limited functionality...");
} else if (missingVars.length > 0) {
  // In production, still throw errors for safety
  console.error("Missing Firebase environment variables:", missingVars);
  console.error(
    "Please check your .env file and Firebase project configuration",
  );
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
}

const app = initializeApp(firebaseConfig);
console.log("Firebase app initialized:", app);
console.log("Firebase config:", firebaseConfig);
console.log("Environment variables:", {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY
    ? "SET"
    : "NOT SET",
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
});

export const db = getFirestore(app);
console.log("Firestore initialized:", db);
export const storage = getStorage(app);
console.log("Storage initialized:", storage);
export const auth = getAuth(app);
console.log("Auth initialized:", auth);
export default app;
