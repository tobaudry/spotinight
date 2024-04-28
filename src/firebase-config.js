import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { ref } from "firebase/database";
import { push } from "firebase/database";
import { set } from "firebase/database";
import { query } from "firebase/database";
import { orderByChild } from "firebase/database";
import { onValue } from "firebase/database";
import { equalTo } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAAdw73Hsdj4bC2Uvy1nbXwSn1lUs84roU",
  authDomain: "spotinight-13b75.firebaseapp.com",
  databaseURL:
    "https://spotinight-13b75-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "spotinight-13b75",
  storageBucket: "spotinight-13b75.appspot.com",
  messagingSenderId: "305811790203",
  appId: "1:305811790203:web:a79d036b8790717525c5de",
  measurementId: "G-XFJHEC9YCQ",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

export { database, ref, push, set, query, orderByChild, onValue, equalTo };
