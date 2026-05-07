import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  query,
  orderBy,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebaseConfig";
import {
  versionProjectCreate,
  versionProjectUpdate,
  versionProjectDelete,
} from "./versionService";

export const RESIDENTIAL_COLLECTION = "projects";
export const COMMERCIAL_COLLECTION = "commercial_projects";
export const RESIDENTIAL_VERSIONS = "project_versions";
export const COMMERCIAL_VERSIONS = "commercial_project_versions";

export function getCollectionForType(propertyType) {
  return propertyType === "commercial"
    ? COMMERCIAL_COLLECTION
    : RESIDENTIAL_COLLECTION;
}

export function getVersionsCollectionForType(propertyType) {
  return propertyType === "commercial"
    ? COMMERCIAL_VERSIONS
    : RESIDENTIAL_VERSIONS;
}

// Keep for backwards-compat
const COLLECTION = RESIDENTIAL_COLLECTION;

/**
 * Add a new project document to Firestore.
 * @param {Object} projectData
 * @param {string} userId - ID of the user creating the project
 * @param {string} collectionName - Firestore collection to write to
 * @returns {Promise<string>} - document ID
 */
export async function addProject(projectData, userId = null, collectionName = COLLECTION) {
  try {
    console.log("Adding project to Firestore...");
    console.log("Project data keys:", Object.keys(projectData));

    const docRef = await addDoc(collection(db, collectionName), {
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("Document created with ID:", docRef.id);

    if (userId) {
      try {
        const versionsCol = collectionName === COMMERCIAL_COLLECTION
          ? COMMERCIAL_VERSIONS
          : RESIDENTIAL_VERSIONS;
        await versionProjectCreate(docRef.id, userId, projectData, versionsCol);
      } catch (versionError) {
        console.error("Error creating version record:", versionError);
      }
    }

    return docRef.id;
  } catch (error) {
    console.error("Firestore error:", error);
    console.error("Error code:", error.code);
    console.error("Error message:", error.message);
    throw error;
  }
}

/**
 * Fetch all projects from Firestore, ordered by createdAt descending.
 * @param {string} collectionName - Firestore collection to query
 * @returns {Promise<Array>}
 */
export async function getAllProjects(collectionName = COLLECTION) {
  try {
    const q = query(collection(db, collectionName), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("projectService: Error in getAllProjects:", error);
    throw error;
  }
}

/**
 * Upload a file to Firebase Storage.
 * @param {string} projectName
 * @param {string} category  - e.g. "sitePlan", "ppt", "conceptualPlan", "others"
 * @param {File} file
 * @param {string} storageRoot - top-level storage folder ("projects" or "commercial_projects")
 * @returns {Promise<string>} - download URL
 */
export async function uploadFile(projectName, category, file, storageRoot = "projects") {
  const safeName = projectName.replace(/[^a-z0-9_-]/gi, "_");
  const storageRef = ref(
    storage,
    `${storageRoot}/${safeName}/${category}/${file.name}`,
  );

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);
  return downloadURL;
}

/**
 * Delete a project document from Firestore.
 * @param {string} projectId - The ID of the project to delete.
 * @param {string} userId - ID of the user deleting the project
 * @param {string} collectionName - Firestore collection
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId, userId = null, collectionName = COLLECTION) {
  try {
    let projectData = null;
    if (userId) {
      try {
        const projectRef = doc(db, collectionName, projectId);
        const projectDoc = await getDoc(projectRef);
        if (projectDoc.exists()) {
          projectData = { id: projectDoc.id, ...projectDoc.data() };
        }
      } catch (getError) {
        console.error("Error getting project data before deletion:", getError);
      }
    }

    await deleteDoc(doc(db, collectionName, projectId));

    if (userId && projectData) {
      try {
        const versionsCol = collectionName === COMMERCIAL_COLLECTION
          ? COMMERCIAL_VERSIONS
          : RESIDENTIAL_VERSIONS;
        await versionProjectDelete(projectId, userId, projectData, versionsCol);
      } catch (versionError) {
        console.error("Error creating version record:", versionError);
      }
    }
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

/**
 * Update an existing project document in Firestore.
 * @param {string} projectId - The ID of the project to update.
 * @param {Object} projectData - The updated project data.
 * @param {string} userId - ID of the user updating the project
 * @param {string} collectionName - Firestore collection
 * @returns {Promise<void>}
 */
export async function updateProject(projectId, projectData, userId = null, collectionName = COLLECTION) {
  try {
    let beforeData = null;
    if (userId) {
      try {
        const projectRef = doc(db, collectionName, projectId);
        const projectDoc = await getDoc(projectRef);
        if (projectDoc.exists()) {
          beforeData = { id: projectDoc.id, ...projectDoc.data() };
        }
      } catch (getError) {
        console.error("Error getting project data before update:", getError);
      }
    }

    const updateData = {
      ...projectData,
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, collectionName, projectId), updateData, { merge: true });

    if (userId && beforeData) {
      try {
        const versionsCol = collectionName === COMMERCIAL_COLLECTION
          ? COMMERCIAL_VERSIONS
          : RESIDENTIAL_VERSIONS;
        await versionProjectUpdate(projectId, userId, beforeData, updateData, versionsCol);
      } catch (versionError) {
        console.error("Error creating version record:", versionError);
      }
    }
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
}
