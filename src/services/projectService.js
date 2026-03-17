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
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../lib/firebaseConfig";

const COLLECTION = "projects";

/**
 * Add a new project document to Firestore.
 * @param {Object} projectData
 * @returns {Promise<string>} - document ID
 */
export async function addProject(projectData) {
  try {
    console.log("Adding project to Firestore...");
    console.log("Project data keys:", Object.keys(projectData));

    const docRef = await addDoc(collection(db, COLLECTION), {
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log("Document created with ID:", docRef.id);
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
 * @returns {Promise<Array>}
 */
export async function getAllProjects() {
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Upload a file to Firebase Storage under /projects/[projectName]/[category]/[fileName]
 * @param {string} projectName
 * @param {string} category  - e.g. "sitePlan", "ppt", "conceptualPlan", "others"
 * @param {File} file
 * @returns {Promise<string>} - download URL
 */
export async function uploadFile(projectName, category, file) {
  const safeName = projectName.replace(/[^a-z0-9_-]/gi, "_");
  const storageRef = ref(
    storage,
    `projects/${safeName}/${category}/${file.name}`
  );
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Delete a project document from Firestore.
 * @param {string} projectId - The ID of the project to delete.
 * @returns {Promise<void>}
 */
export async function deleteProject(projectId) {
  try {
    console.log("Deleting project with ID:", projectId);
    const projectRef = doc(db, COLLECTION, projectId);
    await deleteDoc(projectRef);
    console.log("Project deleted successfully.");
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

/**
 * Update an existing project document in Firestore.
 * @param {string} projectId - The ID of the project to update.
 * @param {Object} projectData - The updated project data.
 * @returns {Promise<void>}
 */
export async function updateProject(projectId, projectData) {
  try {
    console.log("Updating project with ID:", projectId);
    const projectRef = doc(db, COLLECTION, projectId);
    await setDoc(projectRef, projectData, { merge: true });
    console.log("Project updated successfully.");
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
}
