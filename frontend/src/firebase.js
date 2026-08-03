import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";
// Firebase configuration object containing keys and identifiers for the Firebase project. These values are sourced from environment variables for security and flexibility.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};
// Initialize the Firebase app with the provided configuration. This sets up the connection to Firebase services for the application.
const app = initializeApp(firebaseConfig);
// Get the Firebase Authentication instance from the initialized app. This instance will be used for managing user authentication throughout the application.
export const auth = getAuth(app);

// set the authentication persistence to session storage, meaning the user's authentication state will be maintained only for the duration of the session (i.e., until the browser or tab is closed).
setPersistence(auth, browserSessionPersistence);
