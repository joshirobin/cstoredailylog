# Firebase Deployment Guide

This project is configured for **Firebase Hosting** and **Firestore Database**.

## Prerequisites
1.  Ensure you have the Firebase CLI installed:
    ```bash
    npm install -g firebase-tools
    ```
2.  Login to Firebase:
    ```bash
    firebase login
    ```

## Setup
1.  Initialize the project (if not already linked):
    ```bash
    firebase use --add
    # Select your project ID (configured in src/firebaseConfig.ts)
    ```

## Deploy
To deploy the application (Hosting + Firestore Rules + Indexes):

```bash
npm run build
firebase deploy
```

## Environment Variables
The application uses `import.meta.env` for configuration. Ensure your `.env` (or `.env.production`) file contains the correct Firebase config keys:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

## Firestore Security
The default security rules (`firestore.rules`) require users to be authenticated to read/write data.
Ensure your users are logged in via the app's Auth system.
