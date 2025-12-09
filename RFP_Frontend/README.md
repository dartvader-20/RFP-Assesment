## Overview

This is the frontend application for the RFP Automation System.
It is built using React and provides the user interface for creating RFPs, managing vendors, sending proposals, viewing conversations, and comparing proposals.

---

## Features

- Dashboard with RFP overview
- Create and manage RFPs
- Vendor management (add, edit, delete)
- Proposal creation and sending
- Proposal conversations
- Proposal comparison and vendor finalization
- PDF preview of structured RFP
- Smooth UI with skeleton loaders

---

## Tech Used

- React
- Material UI
- Axios
- React Router
- jsPDF

---

## Installation

1. Install dependencies:

```
npm install
```

2. Start the development server:

```
npm start
```

---

## Configuration

Create a simple config file:

```
src/config.js
```

Example:

```
export const API_BASE_URL = "http://localhost:4000";
```

You can change the URL to match your backend.

---

## Folder Structure (Simplified)

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

### Dashboard

Shows:

- Total RFPs
- Open RFPs
- In Review RFPs
- Closed RFPs

And quick actions:

- Create RFP
- Manage Vendors
- View Proposals

---

### Create RFP

- Chat-style interface for generating RFP draft
- Sidebar showing RFP history and statuses
- Shows structured RFP summary
- Button to create proposal for vendors

---

### Vendors Page

- List of all vendors
- Add vendor
- Edit vendor
- Delete vendor
- Skeleton loader while fetching

Uses API:

- GET /api/vendors
- POST /api/vendors
- PUT /api/vendors/:id
- DELETE /api/vendors/:id

---

### Proposal Creation

Inside a dialog:

- Fetch vendors
- Select vendors
- View AI-generated email draft
- Navigate to the PDF editor / email screen

---

### Proposal Conversation

For each proposal:

- Show messages
- Show vendor responses
- Show structured content from vendor emails
- Compare proposals

---

### Proposal Comparison

Displays:

- All proposals for the selected RFP
- AI insights (if available)
- Recommended vendor
- Button to finalize vendor

API used:

- GET /api/proposals/compare?rfpId=
- POST /api/proposals/finalise

---

## API Endpoints Used (Frontend)

- /api/rfps
- /api/vendors
- /api/email/draft
- /api/email/send
- /api/proposals
- /api/proposals/compare
- /api/proposals/finalise

---

## Running Production Build

To build:

```
npm run build
```

To preview:

```
npx serve -s build
```
