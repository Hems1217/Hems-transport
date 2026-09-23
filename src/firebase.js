import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";

// Keep the Firebase configuration supplied for Hems Transport.
const firebaseConfig = {
  apiKey: "AIzaSyDwBBjJzsZfzb0GgFup8znvCrbEnl7dlQw",
  authDomain: "hems-transport.firebaseapp.com",
  projectId: "hems-transport",
  storageBucket: "hems-transport.firebasestorage.app",
  messagingSenderId: "1070971606578",
  appId: "1:1070971606578:web:954c8360936287a6a78e2b",
  measurementId: "G-8WZW846PD0",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Firestore persistence lets the app keep its cached user/profile data while
// offline. Authentication and booking submission still require internet.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
