/**
 * Admin Setup Utility
 * 
 * This script helps create the first admin user for the system.
 * Run this in the browser console after registering a user account.
 * 
 * Instructions:
 * 1. Start the app and register a new user account
 * 2. Open browser console (F12)
 * 3. Copy and paste this code into the console
 * 4. Call setupAdmin() function
 */

import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

/**
 * Promote the current user to admin role
 * This should only be run once to create the first admin
 */
export async function setupAdmin() {
  try {
    // Get current user from auth context (you'll need to pass this)
    const { currentUser } = window.authContext || {};
    
    if (!currentUser) {
      console.error("No user is currently logged in. Please login first.");
      return;
    }

    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      role: "admin",
      updatedAt: new Date()
    });

    console.log("✅ User has been promoted to admin!");
    console.log("Please refresh the page to see the changes.");
    
    return true;
  } catch (error) {
    console.error("Error setting up admin:", error);
    return false;
  }
}

/**
 * Make this function available globally for console access
 */
window.setupAdmin = setupAdmin;

console.log("Admin setup utility loaded. Use setupAdmin() in console to promote current user to admin.");
