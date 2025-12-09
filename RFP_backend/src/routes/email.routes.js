// src/routes/email.routes.js
import express from "express";
import {
    getProposalEmailDraft,
    sendFinalProposalEmail
} from "../controllers/email.controller.js";

const router = express.Router();

// Get draft email for an RFP + vendors
router.post("/draft", getProposalEmailDraft);

// Send final proposal email (with PDF)
router.post("/send", sendFinalProposalEmail);

export default router;
