import admin from 'firebase-admin'

import { googleApplicationCredentials } from './settings'

const serviceAccount = require(googleApplicationCredentials)

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://tmnmedia-fx-sig.firebaseio.com"
})

export const messaging = admin.messaging()
