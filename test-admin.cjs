const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

const firebaseAppConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = admin.initializeApp({ projectId: firebaseAppConfig.projectId });
const db = getFirestore(app, firebaseAppConfig.firestoreDatabaseId);

async function test() {
  try {
    const snap = await db.collection('clinics').doc('dummy').collection('articles').limit(1).get();
    console.log("Success admin articles:", snap.size);
  } catch (e) {
    console.error("Error admin articles:", e.message);
  }
}

test();
