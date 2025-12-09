# **RFP Automation System – Full Documentation (Frontend + Backend + DB Schema)**

## Overview

This system is a complete **RFP (Request for Proposal) Automation Platform** with:

* React frontend
* Node.js + Express backend
* Prisma ORM + PostgreSQL
* Email automation (Nodemailer)
* Google OAuth + Gmail Webhook (auto-parsing vendor replies)
* PDF generation and proposal tracking

It allows companies to create RFPs, send proposals to vendors, track replies, manage proposals, and finalize vendors.

---

# 🎨 **Frontend Documentation**

## Overview

The frontend is built with **React** and provides the UI for:

* Creating RFPs
* Managing vendors
* Sending proposal emails
* Viewing proposal conversations
* Comparing proposals and selecting vendors
* PDF preview of structured RFP

---

## Features

* Dashboard with RFP overview
* Create and manage RFPs
* Vendor CRUD management
* Proposal creation and sending
* Conversation view for each vendor
* Proposal comparison (AI-assisted)
* Finalize selected vendor
* Skeleton loaders and responsive UI

---

## Tech Used

* React
* Material UI
* Axios
* React Router
* jsPDF

---

## Installation

```bash
npm install
npm start
```

---

## Configuration

Create:

```
src/config.js
```

Example:

```js
export const API_BASE_URL = "http://localhost:4000";
```

---

## Folder Structure

```
src/
  components/
    Dashboard/
    CreateRFP/
    Vendors/
    Proposals/
    ProposalConversation/
    Loader/
  config.js
  App.js
  index.js
```

---

## Main Screens

### 📌 Dashboard

Shows:

* Total RFPs
* Open
* In Review
* Closed

Quick actions:

* Create RFP
* Manage Vendors
* View Proposals

---

### 📝 Create RFP

* Chat-style interface
* RFP history sidebar
* Structured RFP summary
* Create proposal for vendors

---

### 👥 Vendor Page

* Add / Edit / Delete vendors
* List with skeleton loader
* Vendor categories
* API Used:

  * GET /api/vendors
  * POST /api/vendors
  * PUT /api/vendors/:id
  * DELETE /api/vendors/:id

---

### ✉️ Proposal Creation (Dialog)

* Select vendors
* AI email draft
* Proceed to PDF/Email screen

---

### 💬 Proposal Conversation

Shows:

* Messages from system, vendor, buyer
* Structured extracted content
* Attachments
* Parsed email insights

---

### 📊 Proposal Comparison

* Compares vendor proposals
* Displays scoring/AI insights
* Recommends best vendor
* Finalization button

APIs:

* GET /api/proposals/compare?rfpId=
* POST /api/proposals/finalise

---

## API Endpoints Used by Frontend

* `/api/rfps`
* `/api/vendors`
* `/api/email/draft`
* `/api/email/send`
* `/api/proposals`
* `/api/proposals/compare`
* `/api/proposals/finalise`

---

## Production Build

```bash
npm run build
npx serve -s build
```

---

# ⚙️ **Backend Documentation**

Backend handles:

* RFP CRUD
* Vendor CRUD
* Proposal creation & tracking
* Nodemailer email sending
* Gmail webhook processing
* Google OAuth flow
* PDF generation

---

## Features

### RFP Management

* Create/update/delete RFPs
* JSON-structured RFP storage
* Status updates (DRAFT → IN_REVIEW → SENT → CLOSED)

### Vendor Management

* CRUD
* Soft delete

### Proposal System

* Auto-generated proposal entries
* Tracking ID creation
* Stores structured & raw data

### Email System

* Sends proposals
* Adds `X-RFP-Tracking-ID` header
* Includes PDF attachment
* Logs all messages

### Google OAuth + Gmail Webhook

* Authenticate Gmail
* Watch for vendor replies
* Extract trackingId
* Map to correct proposal
* Auto-save messages into DB

---

# 📁 Project Structure

```
backend/
  app.js
  server.js
  routes/
    rfp.routes.js
    vendor.routes.js
    proposals.routes.js
    email.routes.js
    googleAuth.js
    googleCallback.js
    gmailWebhook.js
    gmailWatch.js
  services/
    EmailService.js
    GmailService.js
  prisma/
    schema.prisma
  utils/
    pdfGenerator.js
    emailParser.js
```

---

# 🔌 API Endpoints

## RFP Routes – `/api/rfps`

| Method | Endpoint  | Description  |
| ------ | --------- | ------------ |
| GET    | `/`       | Get all RFPs |
| POST   | `/`       | Create RFP   |
| PUT    | `/:rfpId` | Update RFP   |
| DELETE | `/:rfpId` | Soft delete  |

---

## Vendor Routes – `/api/vendors`

| Method | Endpoint     | Description   |
| ------ | ------------ | ------------- |
| GET    | `/`          | List vendors  |
| POST   | `/`          | Add vendor    |
| PUT    | `/:vendorId` | Update vendor |
| DELETE | `/:vendorId` | Soft delete   |

---

## Proposal Routes – `/api/proposals`

| Method | Endpoint                | Description           |
| ------ | ----------------------- | --------------------- |
| GET    | `/rfp/:rfpId`           | Get proposals for RFP |
| GET    | `/:proposalId/messages` | Get message history   |

---

## Email Routes – `/api/email`

### Send Proposal Email

```
POST /api/email/send
```

Example:

```json
{
  "rfpId": 12,
  "vendorIds": [3, 5],
  "subject": "RFP – Office Furniture",
  "message": "Please find attached the proposal."
}
```

---

## Google OAuth Routes

| Method | Endpoint         | Description        |
| ------ | ---------------- | ------------------ |
| GET    | `/auth/google`   | Redirect to Google |
| GET    | `/auth/callback` | OAuth callback     |

---

## Gmail Webhook Routes

| Method | Endpoint     | Description             |
| ------ | ------------ | ----------------------- |
| POST   | `/webhook`   | Gmail push notification |
| POST   | `/api/watch` | Start Gmail watch       |

---

# 🛠 Environment Variables

```
DATABASE_URL=""
MAIL_FROM=""
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""
MAIL_REFRESH_TOKEN=""
PORT=3000
```

---

# 🗄️ Database Schema (Prisma ORM)

## Datasource & Generator

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

---

## Enums

### RFPStatus

```prisma
enum RFPStatus {
  OPEN
  CLOSED
  IN_REVIEW
}
```

### VendorType

```prisma
enum VendorType {
  IT
  FURNITURE
  OFFICE_SUPPLIES
  EQUIPMENT
  LOGISTICS
  OTHER
}
```

### ProposalStatus

```prisma
enum ProposalStatus {
  PENDING
  RECEIVED
  UNDER_REVIEW
  SELECTED
  REJECTED
}
```

---

## Models

### RFP

```prisma
model RFP {
  rfpId        Int       @id @default(autoincrement())
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  title        String?
  description  String?
  structured   Json?
  budget       Float?
  deliveryDays Int?
  userId       Int?
  isDeleted    Boolean   @default(false)
  status       RFPStatus @default(OPEN)
  finalVendorId Int?

  proposals    Proposal[]
  chatMessages RFPChatMessage[]
}
```

---

### Vendor

```prisma
model Vendor {
  vendorId       Int         @id @default(autoincrement())
  name           String
  email          String
  vendorType     VendorType
  contactNumber  String?
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
  isDeleted      Boolean     @default(false)

  proposals      Proposal[]
}
```

---

### Proposal

```prisma
model Proposal {
  proposalId Int             @id @default(autoincrement())
  rfpId      Int
  vendorId   Int
  trackingId String?
  status     ProposalStatus  @default(PENDING)

  rawEmail   String?
  structured Json?
  score      Float?

  createdAt  DateTime        @default(now())
  updatedAt  DateTime        @updatedAt
  isDeleted  Boolean         @default(false)

  rfp        RFP             @relation(fields: [rfpId], references: [rfpId])
  vendor     Vendor          @relation(fields: [vendorId], references: [vendorId])

  messages   ProposalMessage[]
}
```

---

### ProposalMessage

```prisma
model ProposalMessage {
  messageId     Int      @id @default(autoincrement())
  proposalId    Int

  sender        String
  rawMessage    String?
  structured    Json?
  attachmentUrl String?

  createdAt     DateTime @default(now())

  proposal      Proposal @relation(fields: [proposalId], references: [proposalId])
}
```

---

### RFPChatMessage

```prisma
model RFPChatMessage {
  messageId        Int      @id @default(autoincrement())
  rfpId            Int
  userMessage      String?
  assistantMessage String?
  createdAt        DateTime @default(now())

  rfp              RFP      @relation(fields: [rfpId], references: [rfpId])
}
```

---

# ✔️ Status Flow

| Event              | Status    |
| ------------------ | --------- |
| Create RFP         | DRAFT     |
| Email Draft → Send | IN_REVIEW |
| Sent to vendors    | SENT      |
| Finalized          | CLOSED    |

---

# 🧩 Tech Stack Summary

Frontend:

* React, Material UI, Axios

Backend:

* Node.js, Express, Prisma
* PostgreSQL, Nodemailer
* Google OAuth, Gmail Webhooks
* PDF generator

