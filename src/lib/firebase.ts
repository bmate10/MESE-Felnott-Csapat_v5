import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();

/**
 * Validates connection to Firestore as per critical directive.
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    console.log('Firestore connection verified');
  } catch (error) {
    if (error instanceof Error && error.message.includes('permission-denied')) {
      // This is actually a good sign - it means we connected but were blocked by rules
      console.log('Firestore connection verified (Permission Denied as expected)');
    } else {
      console.error("Please check your Firebase configuration:", error);
    }
  }
}

testConnection();
