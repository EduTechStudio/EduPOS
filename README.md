# Store POS Mobile

**An Offline-First Point of Sale Application for Retail Businesses**

Store POS Mobile is a mobile-based Point of Sale (POS) application designed to help retail businesses manage daily store operations through a simple, practical, and efficient interface.

Built with **React Native, Expo, and SQLite**, the application follows an offline-first approach, allowing essential store operations to work using locally stored data without requiring a constant internet connection.

The project focuses on sales transactions, product and inventory management, barcode scanning, transaction records, and thermal receipt printing.

## Overview

Store POS Mobile is designed for small and medium-sized retail businesses that need a practical mobile solution for managing their daily operations.

The application supports both smartphone and tablet layouts, with features designed to accommodate different retail environments, including minimarkets and stores with product variations.

## Features

### Point of Sale
- Product catalog and category browsing.
- Product search and barcode-based product lookup.
- Shopping cart and quantity management.
- Sales transaction processing.
- Cash payment handling.
- Wholesale and tier-based product pricing support.

### Product & Inventory Management
- Product and category management.
- Stock-in and stock-out operations.
- Inventory tracking.
- Product barcode management.
- Stock history.

### Barcode Scanning
- Camera-based barcode scanning.
- Physical barcode scanner support through USB HID.
- Wireless barcode scanner support through a USB receiver and OTG adapter.
- Automatic barcode input handling.
- Product lookup from the POS and product management screens.

### Transaction Management
- Transaction history.
- Transaction details.
- Sales record management.

### Reports
- Sales reports.
- Transaction summaries.
- Operational reporting.

### Receipt Printing
- Thermal printer integration.
- Receipt printing support for 80mm paper.
- 58mm receipt layout support.
- Printer service abstraction.

### Local Database & Backup
- SQLite-based local database.
- Offline-first data storage.
- Local database backup and restore.
- Data persistence across application updates.

### User Management
- User accounts.
- Admin and cashier access levels.
- Individual permission configuration.

> Some operational workflows, including cashier shift management, cancellation and returns, audit logging, and advanced reporting, are being refined as part of the ongoing development roadmap.

## Technology Stack

| Technology | Purpose |
|---|---|
| React Native | Mobile application framework |
| Expo SDK 57 | Development and application build tooling |
| TypeScript | Type-safe application development |
| Expo Router | Application navigation |
| SQLite | Local database storage |
| EAS Build | Android application packaging |

## Architecture

The application uses a local-first architecture.

- **Presentation Layer:** Screens and reusable UI components.
- **Service Layer:** Business logic and application operations.
- **Repository Layer:** Database access and data management.
- **Database Layer:** SQLite storage and migrations.
- **Device Integration:** Barcode scanner and thermal printer services.

This separation helps keep the application maintainable as new business workflows are introduced.

## Project Status

**Active Development**

The application has implemented its core POS functionality and device integrations. Further development is focused on improving operational workflows, data consistency, access control, and reporting.

Planned development areas include:

- Cashier shift management.
- Sales and payment workflow improvements.
- Transaction cancellation and return approval.
- User permission improvements.
- Inventory audit logs.
- Dashboard and reporting enhancements.

## Getting Started

### Prerequisites

- Node.js
- npm
- Expo development environment
- Android device or emulator

### Installation

Clone the repository:

```bash
git clone <YOUR_REPOSITORY_URL>
```

Navigate to the project directory:

```bash
cd store-pos-mobile
```

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npx expo start
```

Follow the Expo CLI instructions to run the application on a compatible device or emulator.

## Android Build

The project uses Expo Application Services (EAS) for Android builds.

To create a preview build:

```bash
eas build --platform android --profile preview
```

Build configuration and signing credentials should be managed through the project's EAS configuration.

## Data & Security Notes

- Application data is stored locally using SQLite.
- Local database files and user-specific data must not be committed to the repository.
- Environment files and sensitive credentials must remain excluded from version control.
- Database migrations should preserve existing user data.
- Application updates should maintain the existing Android package identity and signing configuration.

## Development Philosophy

The project prioritizes:

- Offline-first functionality.
- Practical retail workflows.
- Data consistency and persistence.
- Maintainable application architecture.
- Responsive mobile and tablet interfaces.
- Reliable hardware integration.
- Simple and intuitive user experience.

## License

This project is currently maintained as a portfolio and development project.

License and distribution terms have not yet been finalized.