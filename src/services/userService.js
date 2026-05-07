import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

const USERS_COLLECTION = "users";

/**
 * Create a new user profile in Firestore (pending admin approval)
 * @param {string} uid - User ID from Firebase Auth
 * @param {Object} userData - User data including email, name, role
 * @returns {Promise<Object>} - Created user profile
 */
export async function createUserProfile(uid, userData) {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userProfile = {
      ...userData,
      uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: false, // New users are inactive until approved by admin
      isApproved: false, // Explicit approval flag
    };

    await setDoc(userRef, userProfile);
    console.log("User profile created (pending approval):", userProfile);
    return userProfile;
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
}

/**
 * Get user profile by UID
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} - User profile or null
 */
export async function getUserProfile(uid) {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
}

/**
 * Update user profile
 * @param {string} uid - User ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<void>}
 */
export async function updateUserProfile(uid, updateData) {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
    console.log("User profile updated:", uid);
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
}

/**
 * Get all users (admin only)
 * @returns {Promise<Array>} - Array of user profiles
 */
export async function getAllUsers() {
  try {
    const usersQuery = query(collection(db, USERS_COLLECTION));
    const snapshot = await getDocs(usersQuery);

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting all users:", error);
    throw error;
  }
}

/**
 * Update user role (admin only)
 * @param {string} uid - User ID
 * @param {string} role - New role ('admin' or 'user')
 * @returns {Promise<void>}
 */
export async function updateUserRole(uid, role) {
  if (!["admin", "user"].includes(role)) {
    throw new Error("Invalid role. Must be 'admin' or 'user'");
  }

  return updateUserProfile(uid, { role });
}

/**
 * Deactivate/activate user (admin only)
 * @param {string} uid - User ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<void>}
 */
export async function updateUserStatus(uid, isActive) {
  return updateUserProfile(uid, { isActive });
}

/**
 * Approve a user account (admin only)
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
export async function approveUser(uid) {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    await updateDoc(userRef, {
      isActive: true,
      isApproved: true,
      approvedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log("User approved:", uid);
  } catch (error) {
    console.error("Error approving user:", error);
    throw error;
  }
}

/**
 * Get pending users (admin only)
 * @returns {Promise<Array>} - Array of pending user profiles
 */
export async function getPendingUsers() {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      where("isApproved", "==", false),
    );
    const snapshot = await getDocs(usersQuery);

    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Error getting pending users:", error);
    throw error;
  }
}
