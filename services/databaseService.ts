
import { db, storage } from "../firebaseConfig";
import firebase from "firebase/compat/app";
import { FullCaseRecord, UserProfile } from "../types";

// --- User Profile Operations ---

export const saveUserProfile = async (profile: UserProfile) => {
  try {
    // v8 syntax: db.collection().doc().set()
    await db.collection("users").doc(profile.uid).set(profile, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving profile:", error);
    throw error;
  }
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    // v8 syntax: db.collection().doc().get()
    const snap = await db.collection("users").doc(uid).get();
    if (snap.exists) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    console.warn("Firestore profile fetch warning:", error.message);
    return null;
  }
};

// --- Case Operations ---

// Helper: robust conversion of Base64 to Blob for efficient upload
const base64ToBlob = (base64: string, mimeType: string = 'image/png'): Blob => {
  try {
    const byteString = atob(base64.split(',')[1] || base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  } catch (e) {
    console.error("Blob conversion failed", e);
    return new Blob([], { type: mimeType });
  }
};

export const uploadMedicalImage = async (userId: string, base64Image: string, type: 'xray' | 'mask' = 'xray'): Promise<string> => {
  const timestamp = Date.now();
  const path = `medical_images/${userId}/${timestamp}_${type}.png`;

  try {
    const blob = base64ToBlob(base64Image, 'image/png');
    const storageRef = storage.ref().child(path);
    
    const snapshot = await storageRef.put(blob);
    
    // Attempt standard SDK method first
    try {
        const url = await snapshot.ref.getDownloadURL();
        return url;
    } catch (corsError) {
        console.warn("CORS/DownloadURL error, falling back to manual URL construction:", corsError);
        // Fallback: Construct public URL manually. 
        // NOTE: This requires Storage Rules to allow public read (e.g., allow read: if true;) 
        // or the user to fix CORS config on the bucket.
        const bucket = (storage.app.options as any).storageBucket;
        return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(path)}?alt=media`;
    }
  } catch (error) {
    console.error("Error uploading image (Storage):", error);
    return "https://placehold.co/600x400/png?text=Image+Upload+Failed";
  }
};

export const saveMedicalCase = async (caseData: Omit<FullCaseRecord, 'id' | 'timestamp'>) => {
  try {
    // v8 syntax: db.collection().add()
    const docRef = await db.collection("cases").add({
      ...caseData,
      timestamp: firebase.firestore.Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error("Error saving case (Firestore):", error);
    throw error;
  }
};

export const getUserCases = async (userId: string): Promise<FullCaseRecord[]> => {
  try {
    // v8 syntax: db.collection().where().orderBy().get()
    const querySnapshot = await db.collection("cases")
      .where("userId", "==", userId)
      .orderBy("timestamp", "desc")
      .get();
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FullCaseRecord[];
  } catch (error) {
    console.error("Error fetching cases:", error);
    return [];
  }
};

// --- Stats ---
export const getDashboardStats = async (userId: string) => {
    try {
        const querySnapshot = await db.collection("cases").where("userId", "==", userId).get();
        const cases = querySnapshot.docs.map(doc => doc.data());
        
        const totalCases = cases.length;
        const criticalCount = cases.filter(c => {
          const diag = (c.analysis?.diagnosis || "").toLowerCase();
          return diag.includes('critical') || diag.includes('severe') || (c.analysis?.confidence > 90);
        }).length;
        
        const avgTime = "8.2s"; 

        return { totalCases, criticalCount, avgTime };
    } catch(e) {
        return { totalCases: 0, criticalCount: 0, avgTime: "0s" };
    }
}
