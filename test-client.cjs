const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');
const fs = require('fs');

const firebaseAppConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseAppConfig);
const db = getFirestore(app, firebaseAppConfig.firestoreDatabaseId);

async function test() {
  try {
    const q = query(collection(db, 'clinics/dummy/articles'), limit(1));
    const snap = await getDocs(q);
    console.log("Success client articles:", snap.size);
  } catch (e) {
    console.error("Error client articles:", e);
  }
}

test();
