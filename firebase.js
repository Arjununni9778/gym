// FITZONE Firebase Configuration & Modular SDK Exports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// FITZONE Firebase Project Config
const firebaseConfig = {
    apiKey: "AIzaSyCZs109ySVa8N8lqGYtzyKsJZz7-m7jjgs",
    authDomain: "fitzone-gym-bab26.firebaseapp.com",
    projectId: "fitzone-gym-bab26",
    storageBucket: "fitzone-gym-bab26.firebasestorage.app",
    messagingSenderId: "193069256562",
    appId: "1:193069256562:web:97b99c29169a219a7157eb"
};

// Initialize Firebase App instance once
const app = initializeApp(firebaseConfig);

// Initialize Firebase Services
const auth = getAuth(app);
const db = getFirestore(app);

// Export instances and modular helpers
export {
    app,
    auth,
    db,
    // Auth functions
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    sendEmailVerification,
    sendPasswordResetEmail,
    onAuthStateChanged,
    signOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    // Firestore functions
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp
};

console.log("FITZONE Firebase & Modular Services initialized successfully.");
