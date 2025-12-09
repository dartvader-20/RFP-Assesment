// src/controllers/proposals.controller.js
import { ProposalsService } from "../services/proposals.service.js";

export const ProposalsController = {

    async getAllProposals(req, res) {
        try {
            const proposals = await ProposalsService.getAllProposals();
            res.json(proposals);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },
    // GET /proposals/rfp/:rfpId
    async getProposals(req, res) {
        try {
            const { rfpId } = req.params;
            const proposals = await ProposalsService.getProposalsByRfpId(Number(rfpId));
            res.json(proposals);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // GET /proposals/:proposalId
    async getProposal(req, res) {
        try {
            const { proposalId } = req.params;
            const proposal = await ProposalsService.getProposalById(Number(proposalId));
            if (!proposal)
                return res.status(404).json({ error: "Proposal not found" });

            res.json(proposal);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // GET /proposals/compare
    async compareProposals(req, res) {
        try {
            const { rfpId } = req.query;

            if (!rfpId) {
                return res.status(400).json({ error: "rfpId query parameter is required" });
            }

            const comparison = await ProposalsService.compareProposals(Number(rfpId));
            res.json(comparison);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    },

    // POST /proposals
    async finaliseProposal(req, res) {
        try {
            const { rfpId, proposalId, vendorId } = req.body;
            if (!rfpId || !proposalId || !vendorId) {
                return res.status(400).json({ error: "rfpId, proposalId, and vendorId are required" });
            }

            await ProposalsService.finaliseProposal({ rfpId, proposalId, vendorId });

            res.status(200).json({ message: "Proposal has been successfully finalised and the vendor notified." });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
};