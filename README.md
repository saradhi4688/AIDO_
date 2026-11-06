# AIDO

AIDO is a React/Vite application backed by Firebase Authentication, Cloud
Firestore, and Cloud Storage. The separate `aido-admin-panel/` app uses the
same Firebase project. The root app is the deployment target; `Hackthon_GDG/`
is an older duplicate and is not used by the root scripts.

## Firebase project setup

1. Use Node.js 24.12 or newer.
2. In Firebase Console, create a project and register separate Web apps for
   the main app and admin panel (both may share the same project).
3. Enable **Authentication → Email/Password**, create a **Firestore Database**,
   and enable **Cloud Storage**.
4. Add the production site domains under Authentication's authorized domains.
   Configure Firebase's email templates and your sender/domain before launch.
5. Copy root `.env.example` to `.env` and set the Firebase Web app values from
   the Firebase Console. Copy `aido-admin-panel/.env.example` to
   `aido-admin-panel/.env` and set the same values.
   These `VITE_FIREBASE_*` values are public client configuration, not
   credentials. Never put a Firebase service-account key in a `VITE_*` value.
6. Deploy the Firestore rules/indexes, Storage rules, and review-aggregation
   Cloud Function before opening the apps. Cloud Functions deployment requires
   the Firebase project to use the Blaze billing plan:

   ```sh
   npx firebase-tools deploy --project YOUR_FIREBASE_PROJECT_ID --only firestore:rules,firestore:indexes,storage,functions
   ```

7. Create the first admin account using a Firebase service account. Keep the
   downloaded JSON outside the repository, copy `server/.env.example` to
   `server/.env`, fill in the project ID, admin email, a unique 12+ character
   password, and the service-account file path. Then run:

   ```sh
   cd server
   npm install
   npm run create-admin
   ```

   This provisions the Firebase Auth account, sets the `admin` custom claim,
   and creates the matching Firestore profile. The admin panel does not allow
   self-registration. Never commit the service-account file or `server/.env`.

If either app reports `auth/configuration-not-found`, the Firebase client
configuration is being read, but Firebase Authentication is not configured
for that project (or the app is pointed at a different project). In Firebase
Console, open **Authentication → Get started → Sign-in method**, enable
**Email/Password**, and confirm the project ID matches the app’s
`VITE_FIREBASE_PROJECT_ID`. Add `localhost` and your deployed host under
**Authentication → Settings → Authorized domains** for local and production
sign-in.

## Run and build

Main app:

```sh
npm install
npm run dev
npm run lint
npm run build
```

Admin panel:

```sh
cd aido-admin-panel
npm install
npm run dev
npm run build
```

## Deploy to Vercel

Deploy the main app and admin panel as two separate Vercel projects from this
repository:

1. Import the repository in Vercel for the main app. Set the **Root Directory**
   to `.`. The root `vercel.json` configures the Vite build, `dist` output, and
   SPA route fallback.
2. Add these environment variables to the main app's Vercel project for each
   deployment environment you use:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`,
   `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`,
   `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, and
   `VITE_ADMIN_PANEL_URL`.
3. Create a second Vercel project from the same repository and set its **Root
   Directory** to `aido-admin-panel`. Its `vercel.json` sets the admin Vite
   build and SPA fallback. Add the same six `VITE_FIREBASE_*` variables to
   this project.
4. After the admin project is deployed, set the main app's
   `VITE_ADMIN_PANEL_URL` to the admin project's public URL and redeploy the
   main app.
5. Add both deployed domains in Firebase Console under **Authentication →
   Settings → Authorized domains**.

Vercel hosts the two web frontends; Firebase remains the backend for
Authentication, Firestore, Storage, and Cloud Functions. Deploy Firebase rules
and Functions separately with Firebase CLI as described above. Never add the
Firebase service-account JSON or `server/.env` to Vercel.

## Data and account behavior

- User registration and login use Firebase Email/Password. New accounts must
  verify their email before using requests, chat, or reviews. Password reset
  links are sent by Firebase.
- User profiles and reviews, live service requests, chat messages, public
  AidMate profiles, and uploaded certificates/photos use Firestore or Storage.
- Admin access is protected by the server-set Firebase `admin` custom claim.
  Firestore and Storage rules are part of this repository; do not replace them
  with public test-mode rules.
- Existing PostgreSQL password hashes cannot be imported as Firebase
  passwords. Existing records need a planned data export/import, and users
  must set a Firebase password (or reset it) before switching production
  traffic. No PostgreSQL service is required by the root app.

Review the Firebase Console's Auth, Firestore, and Storage usage/billing
limits before public launch. Firebase Web configuration is not a substitute
for security rules; authorization is enforced by the deployed rules and admin
custom claim.
