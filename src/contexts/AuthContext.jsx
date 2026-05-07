import React, { createContext, useContext, useEffect, useState } from "react";
import { auth } from "../lib/firebaseConfig";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
} from "firebase/auth";
import { getUserProfile, createUserProfile } from "../services/userService";
import { AUTH_ROLES } from "../utils/authHelpers";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const allowedRoles = [AUTH_ROLES.ADMIN, AUTH_ROLES.USER];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          } else {
            // Create user profile if it doesn't exist
            const newProfile = await createUserProfile(user.uid, {
              email: user.email,
              name: user.displayName || user.email.split("@")[0],
              role: AUTH_ROLES.USER, // Default role
            });
            setUserProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  async function login(email, password) {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  }

  async function register(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);

    // Create user profile with additional info
    await createUserProfile(result.user.uid, {
      email: result.user.email,
      name: name,
      role: AUTH_ROLES.USER, // Default role
    });

    return result.user;
  }

  async function logout() {
    await signOut(auth);
    setCurrentUser(null);
    setUserProfile(null);
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email);
  }

  const value = {
    currentUser,
    userProfile,
    loading,
    login,
    register,
    logout,
    resetPassword,
    isAdmin: userProfile?.role === AUTH_ROLES.ADMIN,
    isUser: userProfile?.role === AUTH_ROLES.USER,
    isApproved: userProfile?.isApproved || false,
    canAccess:
      userProfile?.role === AUTH_ROLES.ADMIN ||
      (userProfile?.isApproved && allowedRoles.includes(userProfile?.role)),
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
