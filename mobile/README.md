# Pramaan Rakshak — Mobile App

Pramaan Rakshak is the Flutter mobile application for the **Secure Digital Document & Evidence Management System (SDMS)** developed for **Smart India Hackathon 2026 — PS26190**.

The mobile app is built for authorized users who need to access case information, receive updates, review documents and perform permitted case-related actions from a mobile device.

The app communicates with the central Django backend through REST APIs.

---

## Tech Stack

* **Flutter**
* **Dart**
* **Django REST Framework**
* **JWT Authentication**
* **WebSockets / Django Channels**
* **AES-256-GCM** for protected document handling
* **SHA-256** for integrity verification
* **Hyperledger Fabric** for trusted integrity and lifecycle records
* **Supabase Storage** for encrypted files

---

## Project Structure

```text
mobile/
│
├── android/
├── ios/
├── lib/
│   │
│   ├── main.dart
│   │
│   ├── models/
│   ├── screens/
│   ├── widgets/
│   ├── services/
│   ├── providers/
│   ├── utils/
│   └── config/
│
├── assets/
│
├── test/
│
├── pubspec.yaml
└── README.md
```

The exact folders may change as the application develops, but the main application code remains inside `lib/`.

---

## Main Features

### Authentication

* Secure login
* JWT-based API authentication
* Session/token handling
* Role-based access
* Additional verification for sensitive actions

### Case Management

Authorized users can access cases available to them according to their role and permissions.

The application is designed around a common **Case ID**, allowing related records to remain connected throughout the case lifecycle.

### Document Management

The mobile application can be used to:

* View authorized case documents
* Upload permitted documents
* Check document information
* Track document status
* Receive document-related updates

Documents are not treated as ordinary files. Access depends on the user's role, case assignment, case stage and permitted action.

### Evidence Tracking

Evidence-related information remains connected to its case so authorized users can follow important events throughout the evidence lifecycle.

### Real-Time Updates

The app can receive live case updates through WebSockets when supported by the backend.

Examples include:

* Case status changes
* New document uploads
* Assignment updates
* Approval or rejection events
* Important case notifications

### Secure Document Access

Sensitive documents are stored as encrypted files rather than being kept as plain files inside the mobile application.

The backend controls whether a user is allowed to access a particular document.

---

## Access Control

The application does not rely only on the user's role.

Effective access is based on:

```text
Role
  +
Case Assignment
  +
Case Stage
  +
Action Permission
```

This prevents a user from accessing every case or performing every action simply because they have a particular role.

Supported roles include:

* Administrator
* Constable
* Head Constable
* Duty Officer
* Investigating Officer
* Forensic Expert
* DSP / ACP
* SP / DCP
* Public Prosecutor
* Judge

The exact screens and actions shown to a user depend on the permissions returned by the backend.

---

## API Communication

The Flutter application communicates with the Django backend through REST APIs.

```text
Flutter App
     │
     │ HTTPS
     ▼
Django REST Framework
     │
     ├── Authentication
     ├── Authorization
     ├── Case Management
     ├── Document Management
     ├── Evidence Management
     └── Notifications
```

The mobile application should never contain backend secrets, private blockchain credentials or master encryption keys.

---

## Security

Security is handled across both the mobile application and backend.

### Authentication

Authentication is performed through the Django backend using secure API authentication.

### Authorization

The backend remains the final authority for:

* Case access
* Document access
* Upload permissions
* Approval/rejection actions
* Evidence actions
* Administrative operations

The Flutter UI only reflects the permissions provided by the backend.

### Secure Communication

Production API communication should use HTTPS/TLS.

### Sensitive Data

The application avoids storing unnecessary sensitive case information locally.

Temporary data should be cleared when it is no longer required.

### Critical Actions

Sensitive operations may require additional verification such as:

* Device authentication
* Step-up authentication
* Digital signature verification

---

## Document Security Flow

The mobile application sends permitted uploads to the backend.

The backend handles the security processing:

```text
Flutter App
     │
     ▼
Authenticated Upload
     │
     ▼
Quarantine
     │
     ▼
Malware Scan
     │
     ▼
File-Type Validation
     │
     ▼
SHA-256 Verification
     │
     ▼
AI Processing
     │
     ▼
AES-256-GCM Encryption
     │
     ├──────────────► Supabase Storage
     │
     └──────────────► Hyperledger Fabric
```

The mobile application is therefore not responsible for implementing the complete document-security pipeline by itself.

---

## Running the App

### Requirements

Make sure Flutter and Dart are installed.

Check the installation with:

```bash
flutter doctor
```

Then verify Flutter:

```bash
flutter --version
```

---

### Install Dependencies

From the mobile project directory:

```bash
flutter pub get
```

---

### Run on a Connected Device

```bash
flutter devices
```

Then:

```bash
flutter run
```

Or select a device from Android Studio / VS Code and run the project.

---

## Backend Configuration

The app needs the Django backend URL to communicate with the server.

Keep development and production endpoints separate.

For example:

```text
Development
http://10.0.2.2:8000/

Production
https://your-production-api.example.com/
```

For Android Emulator, `10.0.2.2` can be used to access the host machine's localhost.

Do not hard-code production secrets into the Flutter source code.

---

## Building the APK

For a release APK:

```bash
flutter build apk --release
```

The generated APK will normally be available under:

```text
build/app/outputs/flutter-apk/
```

For Play Store distribution, use an appropriately signed Android App Bundle:

```bash
flutter build appbundle --release
```

---

## Development Notes

The Flutter application is only one part of the Pramaan Rakshak system.

```text
                 PRAMAAN RAKSHAK

        ┌──────────────────────────┐
        │      Flutter Mobile      │
        └────────────┬─────────────┘
                     │
                  REST API
                     │
        ┌────────────▼─────────────┐
        │     Django Backend       │
        └──────┬─────────┬─────────┘
               │         │
               ▼         ▼
        Supabase       Fabric
        Storage        Network
               │
               ▼
             Chroma
          AI / Search
```

The backend handles the main authorization, document processing and system-level security logic.

---

## Important Security Rules

Do not commit any of the following to GitHub:

```text
.env files
API secrets
JWT secrets
Supabase service keys
Private keys
Fabric certificates
Wallet credentials
Encryption keys
Production credentials
```

Use environment-specific configuration and secret management for deployment.

---

## Current Status

This mobile application is being developed as part of the **Pramaan Rakshak SIH 2026 project**.

The application and backend are under active development, so APIs, screens and internal project structure may change during implementation.

---

## Related Project

The Flutter app works together with the Pramaan Rakshak backend and web application.

```text
Pramaan Rakshak
│
├── Mobile App
│   └── Flutter
│
├── Web Application
│   └── Django Templates
│
├── Backend
│   └── Django + Django REST Framework
│
├── Blockchain
│   └── Hyperledger Fabric
│
├── File Storage
│   └── Supabase
│
└── AI / Search
    └── Chroma
```

---

## SIH 2026

**Project:** Pramaan Rakshak
**Problem Statement:** PS26190
**Ministry:** Ministry of Home Affairs
**Platform:** Flutter Mobile Application

> **One Case. One Trusted Record. One Traceable Journey.**
