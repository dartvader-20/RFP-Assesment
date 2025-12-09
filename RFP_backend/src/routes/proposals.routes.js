// src/routes/proposals.routes.js
import express from "express";
import { ProposalsController } from "../controllers/proposals.controller.js";

const router = express.Router();

router.get("/", ProposalsController.getAllProposals);
router.get("/rfp/:rfpId", ProposalsController.getProposals);
router.get("/compare", ProposalsController.compareProposals);
router.get("/:proposalId", ProposalsController.getProposal);
router.post("/finalise", ProposalsController.finaliseProposal);
export default router;