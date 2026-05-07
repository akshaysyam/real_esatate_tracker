import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../lib/firebaseConfig";

export const VERSIONS_COLLECTION = "project_versions";
export const COMMERCIAL_VERSIONS_COLLECTION = "commercial_project_versions";

/**
 * Create a version record for a project change
 * @param {string} projectId
 * @param {string} userId
 * @param {string} action - 'create' | 'update' | 'delete'
 * @param {Object} changes
 * @param {string} description
 * @param {string} versionsCollection - which versions collection to write to
 * @returns {Promise<string>} - Version document ID
 */
export async function createVersion(
  projectId,
  userId,
  action,
  changes,
  description,
  versionsCollection = VERSIONS_COLLECTION,
) {
  try {
    const versionData = {
      projectId,
      userId,
      action,
      changes,
      description,
      timestamp: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, versionsCollection), versionData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating version record:", error);
    throw error;
  }
}

/**
 * Get all versions for a specific project
 * @param {string} projectId
 * @param {string} versionsCollection
 * @returns {Promise<Array>}
 */
export async function getProjectVersions(projectId, versionsCollection = VERSIONS_COLLECTION) {
  try {
    const q = query(
      collection(db, versionsCollection),
      where("projectId", "==", projectId),
      orderBy("timestamp", "desc"),
    );

    const snapshot = await getDocs(q);
    const versions = [];

    for (const versionDoc of snapshot.docs) {
      const versionData = { id: versionDoc.id, ...versionDoc.data() };
      if (versionData.userId) {
        const userDoc = await getDoc(doc(db, "users", versionData.userId));
        if (userDoc.exists()) {
          versionData.userInfo = { id: userDoc.id, ...userDoc.data() };
        }
      }
      versions.push(versionData);
    }

    return versions;
  } catch (error) {
    console.error("Error getting project versions:", error);
    throw error;
  }
}

/**
 * Get all version records (admin only)
 * @param {string} versionsCollection
 * @returns {Promise<Array>}
 */
export async function getAllVersions(versionsCollection = VERSIONS_COLLECTION) {
  try {
    const q = query(
      collection(db, versionsCollection),
      orderBy("timestamp", "desc"),
    );

    const snapshot = await getDocs(q);
    const versions = [];

    for (const versionDoc of snapshot.docs) {
      const versionData = { id: versionDoc.id, ...versionDoc.data() };
      if (versionData.userId) {
        const userDoc = await getDoc(doc(db, "users", versionData.userId));
        if (userDoc.exists()) {
          versionData.userInfo = { id: userDoc.id, ...userDoc.data() };
        }
      }
      versions.push(versionData);
    }

    return versions;
  } catch (error) {
    console.error("Error getting all versions:", error);
    throw error;
  }
}

export async function versionProjectCreate(projectId, userId, projectData, versionsCollection = VERSIONS_COLLECTION) {
  return createVersion(
    projectId,
    userId,
    "create",
    { after: projectData },
    `Created new project: ${projectData.projectName || "Untitled"}`,
    versionsCollection,
  );
}

export async function versionProjectUpdate(projectId, userId, beforeData, afterData, versionsCollection = VERSIONS_COLLECTION) {
  const changes = {};
  let hasChanges = false;

  for (const key in afterData) {
    if (beforeData[key] !== afterData[key]) {
      changes[key] = { before: beforeData[key], after: afterData[key] };
      hasChanges = true;
    }
  }

  if (!hasChanges) return null;

  return createVersion(
    projectId,
    userId,
    "update",
    changes,
    `Updated project: ${afterData.projectName || beforeData.projectName || "Project"}`,
    versionsCollection,
  );
}

export async function versionProjectDelete(projectId, userId, projectData, versionsCollection = VERSIONS_COLLECTION) {
  return createVersion(
    projectId,
    userId,
    "delete",
    { before: projectData },
    `Deleted project: ${projectData.projectName || "Untitled"}`,
    versionsCollection,
  );
}
