# 📌 **RFP Management System – Backend**

Backend service for managing **RFPs**, **vendors**, **proposals**, **email workflows**, **Gmail webhook tracking**, and **Google OAuth integration**.
Built with **Node.js**, **Express**, **Prisma**, and **Nodemailer**.

---

## 🚀 **Features**

### ✅ **RFP Management**

- Create, update, delete RFPs
- Store structured JSON for automatic PDF generation
- Manage RFP status updates (e.g., _DRAFT → IN_REVIEW → SENT → CLOSED_)

### ✅ **Vendor Management**

- Add, update, delete vendors
- Assign vendors to RFPs

### ✅ **Proposal Management**

- Automatic proposal creation when sending an email
- Tracks proposal status
- Generates unique tracking IDs
- Logs all sent/received messages

### ✅ **Email System**

- Sends proposal emails to vendors
- Includes:

  - Tracking ID in **subject line**
  - `X-RFP-Tracking-ID` in headers
  - PDF attachment generated from structured JSON
  - Footer reference ID

- Logs outgoing messages into `ProposalMessage` table

### ✅ **Google OAuth + Gmail Webhook**

- OAuth login to connect Gmail
- Gmail Webhook to receive vendor reply emails
- Automatically parses incoming emails and maps them back to proposal via trackingId
- Stores message logs in the DB

---

## 📁 **Project Structure**

```
backend/
│
├── app.js               # Express app setup
├── server.js            # Entry point
│
├── routes/
│   ├── rfp.routes.js
│   ├── vendor.routes.js
│   ├── proposals.routes.js
│   ├── email.routes.js
│   ├── googleAuth.js
│   ├── googleCallback.js
│   ├── gmailWebhook.js
│   ├── gmailWatch.js
│
├── services/
│   ├── EmailService.js        # Sending emails + PDF generation
│   ├── GmailService.js        # Gmail webhook + parsing
│
├── prisma/
│   ├── schema.prisma
│
└── utils/
    ├── pdfGenerator.js
    ├── emailParser.js
```

---

## 🔌 **API Endpoints**

### ### 📍 **RFP Routes**

`/api/rfps`

| Method | Endpoint  | Description      |
| ------ | --------- | ---------------- |
| GET    | `/`       | Get all RFPs     |
| POST   | `/`       | Create a new RFP |
| PUT    | `/:rfpId` | Update RFP       |
| DELETE | `/:rfpId` | Soft delete      |

---

### 📍 **Vendor Routes**

`/api/vendors`

| Method | Endpoint     | Description   |
| ------ | ------------ | ------------- |
| GET    | `/`          | List vendors  |
| POST   | `/`          | Create vendor |
| PUT    | `/:vendorId` | Update vendor |
| DELETE | `/:vendorId` | Soft delete   |

---

### 📍 **Proposal Routes**

`/api/proposals`

| Method | Endpoint                | Description                   |
| ------ | ----------------------- | ----------------------------- |
| GET    | `/rfp/:rfpId`           | Get proposals for an RFP      |
| GET    | `/:proposalId/messages` | List proposal message history |

---

### 📍 **Email Routes**

`/api/email`

#### **Send Proposal Email**

```
POST /api/email/send
```

**Body Example:**

```json
{
  "rfpId": 12,
  "vendorIds": [3, 5],
  "subject": "RFP – Office Furniture",
  "message": "Please find attached the proposal.",
  "status": "IN_REVIEW"
}
```

📌 When this runs:

1. Creates proposal if not exists
2. Generates trackingId
3. Updates `proposal.trackingId`
4. Sends email with PDF attachment
5. Updates RFP status
6. Logs entry into ProposalMessage

---

### 📍 **Google OAuth Routes**

| Method | Endpoint         | Description                   |
| ------ | ---------------- | ----------------------------- |
| GET    | `/auth/google`   | Redirect user to Google login |
| GET    | `/auth/callback` | Google OAuth callback         |

---

### 📍 **Gmail Webhook Routes**

| Method | Endpoint     | Description                                |
| ------ | ------------ | ------------------------------------------ |
| POST   | `/webhook`   | Gmail push notification (message received) |
| POST   | `/api/watch` | Start Gmail watch channel                  |

Webhook automatically extracts:

- trackingId from email
- proposalId
- sender email
- raw message
- attachments

Then logs into `ProposalMessage`.

---

## 📄 **Application Entry Points**

### **app.js**

Configures:

- Express
- CORS
- JSON parsers
- API routes
- Webhook routes

### **server.js**

Starts the server:

```js
import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log("Server running on port", port);
});
```

---

## 🛠 **Environment Variables**

Create `.env`:

```
DATABASE_URL="postgresql://..."
MAIL_FROM="noreply@yourdomain.com"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GOOGLE_REDIRECT_URI=""
MAIL_REFRESH_TOKEN=""
PORT=3000
```

---

## 🧪 **Sending Proposal Email (Frontend Example)**

```js
await axios.post("/api/email/send", {
  rfpId: Number(rfpId),
  vendorIds: draft.vendors.map((v) => Number(v.vendorId)),
  subject: emailSubject,
  message: emailBody,
  status: "IN_REVIEW",
});
```

---

## 📦 **Install & Run**

### Install:

```
npm install
```

### Run migrations:

```
npx prisma migrate deploy
```

### Start server:

```
npm run start
```

### Dev mode:

```
npm run dev
```

---

## ✔️ **Status Flow**

| Event                        | RFP Status  |
| ---------------------------- | ----------- |
| Drafting begins              | `DRAFT`     |
| Email screen send            | `IN_REVIEW` |
| Proposal sent to all vendors | `SENT`      |
| Proposal closed              | `CLOSED`    |

---

## 🧩 Tech Stack

- **Node.js / Express**
- **Prisma + PostgreSQL**
- **Nodemailer**
- **Google OAuth 2.0**
- **Gmail Push Notifications**
- **PDFKit / PDF generator**

# 🗄️ **Database Schema (Prisma ORM)**

This system uses **PostgreSQL** with **Prisma ORM**.
Below is the complete schema with model definitions, enums, and relationships.

---

## 🔧 **Datasource & Generator**

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

# 🧩 **Enums Explained**

### **RFPStatus**

```prisma
enum RFPStatus {
  OPEN
  CLOSED
  IN_REVIEW
}
```

- `OPEN` → RFP is created and available for vendor assignment
- `IN_REVIEW` → Email sent; proposals awaited
- `CLOSED` → RFP finalized and no new proposals accepted

---

### **VendorType**

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

Categorizes vendor industries.

---

### **ProposalStatus**

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

# 🗃️ **Models & Relationships**

## 📄 **RFP Model**

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

### **Notes**

- `structured` holds AI-generated metadata for PDF creation.
- `status` changes when sending emails (ex: `IN_REVIEW`).
- One RFP → Many Proposals
- One RFP → Many Chat Messages

---

## 🧾 **Vendor Model**

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

### **Notes**

- Vendors may be soft-deleted.
- One Vendor → Many Proposals.

---

## 📑 **Proposal Model**

```prisma
model Proposal {
  proposalId Int             @id @default(autoincrement())
  rfpId      Int
  vendorId   Int
  trackingId   String?
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

### **Notes**

- `trackingId` uniquely maps email replies.
- `structured` stores parsed vendor quotations.
- One Proposal → Many Proposal Messages.

---

## 💬 **ProposalMessage Model**

```prisma
model ProposalMessage {
  messageId     Int      @id @default(autoincrement())
  proposalId    Int

  sender        String   // "VENDOR", "BUYER", "SYSTEM"
  rawMessage    String?
  structured    Json?
  attachmentUrl String?

  createdAt     DateTime @default(now())

  proposal      Proposal @relation(fields: [proposalId], references: [proposalId])
}
```

### **Notes**

- Logs all outgoing/incoming messages.
- Used by Gmail webhook for vendor replies.

---

## 💭 **RFPChatMessage Model**

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

### **Notes**

- Stores chat history between user and AI for each RFP.

---

# 📌 **Relationships Summary**

| Model               | Relationship |
| ------------------- | ------------ |
| RFP → Proposals     | 1 : Many     |
| RFP → ChatMsgs      | 1 : Many     |
| Vendor → Proposals  | 1 : Many     |
| Proposal → Messages | 1 : Many     |

---

# 📦 **How Prisma Works Here**

### ⭐ Generate Prisma Client

```
npx prisma generate
```

### ⭐ Apply Migrations

```
npx prisma migrate deploy
```

### ⭐ Format Database Schema

```
npx prisma format
```

---

# 🔍 Why this schema?

### Supports:

- AI-powered RFP structuring
- Vendor email pipelines
- Automated proposal tracking
- Gmail webhook message ingestion
- Full message history timeline
- Multi-vendor connections per RFP

It is optimized for:

- Scalability
- Email-based tracking
- Real-time updates
- Clean workflows

---

# 📌 This README now includes:

✔️ Full system features
✔️ All routes + workflows
✔️ Email system logic
✔️ Google OAuth & Gmail Webhook
✔️ Installation & environment setup
✔️ **COMPLETE Prisma schema + explanation**
✔️ Status flows
✔️ Frontend usage example
