const { initializeApp } = require("firebase/app");
const { getFirestore, collection, addDoc, getDocs } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyBd7GSBo-TX1jq5owp0umA_LfORfqnYMZ0",
  authDomain: "ngambonpesantren.firebaseapp.com",
  projectId: "ngambonpesantren",
  storageBucket: "ngambonpesantren.firebasestorage.app",
  messagingSenderId: "910820220862",
  appId: "1:910820220862:web:567e3698c39c0c574023ef"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
  try {
    console.log("Reading...");
    await getDocs(collection(db, "categories"));
    console.log("Success reading");
  } catch (err) {
    console.error("Error: ", err.message);
  }
}
seed();
