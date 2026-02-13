
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCaTA_hYrgoJ1_rqWg3syC8TDaUbTG7Jzc",
  authDomain: "medic-dcd6a.firebaseapp.com",
  projectId: "medic-dcd6a",
  storageBucket: "medic-dcd6a.firebasestorage.app",
  messagingSenderId: "941178890472",
  appId: "1:941178890472:web:a0f66096a469a98e4d015d",
  measurementId: "G-BX3KRSFPSS"
};

// Initialize Firebase (check if already initialized for hot-reloading)
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const auth = app.auth();
export const db = app.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
      console.warn('Persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
      console.warn('Persistence failed: Browser not supported');
  }
});

export const storage = app.storage();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export default app;
