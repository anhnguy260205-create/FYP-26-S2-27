import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDGHhjAT_wDilL3VLVlMrCFcxKspGAcTF8",
    authDomain: "fyp-26-s2-27.firebaseapp.com",
    projectId: "fyp-26-s2-27",
    storageBucket: "fyp-26-s2-27.firebasestorage.app",
    messagingSenderId: "848831981442",
    appId: "1:848831981442:web:1624139594ad0a1e01519b",
    measurementId: "G-8XXYXQ2CBN"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);