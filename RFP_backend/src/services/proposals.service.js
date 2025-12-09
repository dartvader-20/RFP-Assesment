// src/services/proposals.service.js
import prisma from "../db/prismaClient.js";
import { compareStructuredProposals } from "./aiService.js";
import EmailService from "./email.service.js";

export const ProposalsService = {
    async getAllProposals() {
        return prisma.proposal.findMany({
            where: { isDeleted: false },
            include: {
                vendor: true,
                messages: true,
            },
        });
    },
    // Get all proposals for an RFP
    async getProposalsByRfpId(rfpId) {
        return prisma.proposal.findMany({
            where: { rfpId, isDeleted: false },
            include: {
                vendor: true,
                messages: true,
            }
        });
    },

    // Get a single proposal
    async getProposalById(proposalId) {
        const proposal = await prisma.proposal.findFirst({
            where: { proposalId, isDeleted: false },
            include: {
                vendor: true,
                rfp: true,       // include the linked RFP
                messages: true,
            },
        });

        if (!proposal) return null;

        // Return structured JSON from the RFP table as structuredJson
        return {
            ...proposal,
            structuredJson: proposal.rfp?.structured || null,
        };
    },

    // Compare proposals for an RFP
    async compareProposals(rfpId) {
        // 1. Fetch proposals
        const proposals = await prisma.proposal.findMany({
            where: { rfpId, isDeleted: false },
            include: {
                vendor: true,
                messages: true
            }
        });

        if (!proposals || proposals.length === 0) return [];

        // 2. Prepare output
        const comparison = proposals.map((proposal) => {
            // Get the first vendor message that contains structured JSON
            const structuredMsg = proposal.messages.find(
                (m) => m.sender === "VENDOR" && m.structured
            );

            // Get raw vendor messages (fallback)
            const rawVendorMessages = proposal.messages
                .filter((m) => m.sender === "VENDOR")
                .map((m) => m.rawMessage)
                .join("\n\n");

            return {
                proposalId: proposal.proposalId,

                vendor: {
                    vendorId: proposal.vendor.vendorId,
                    name: proposal.vendor.name,
                    email: proposal.vendor.email,
                    phone: proposal.vendor.phone || null
                },

                structuredProposal: structuredMsg?.structured || null,

                rawMessage: rawVendorMessages || null
            };
        });
        const structuredList = comparison.map((c) => ({
            vendorName: c.vendor?.name || `Vendor ${c.proposalId}`,
            structured: c.structuredProposal || null,
            proposalId: c.proposalId,
        }));

        const aiComparison = await compareStructuredProposals(structuredList);

        return {
            proposals: comparison,
            aiComparison   // includes insights + recommended vendor
        };
    },

    async finaliseProposal({ rfpId, proposalId, vendorId }) {
        // 1️⃣ Fetch the selected proposal and vendor
        const selectedProposal = await prisma.proposal.findUnique({
            where: { proposalId },
            include: {
                vendor: true,
                rfp: true,
            }
        });

        if (!selectedProposal) throw new Error("Proposal not found");

        // 2️⃣ Update the selected proposal to SELECTED
        await prisma.proposal.update({
            where: { proposalId },
            data: { status: "SELECTED" }
        });

        // 3️⃣ Update all other proposals for the same RFP to REJECTED
        await prisma.proposal.updateMany({
            where: {
                rfpId,
                proposalId: { not: proposalId },
                isDeleted: false
            },
            data: { status: "REJECTED" }
        });

        // 4️⃣ Update the RFP table: status, finalVendorId, and structured JSON
        await prisma.rFP.update({
            where: { rfpId },
            data: {
                status: "CLOSED",
                finalVendorId: vendorId,
                structured: selectedProposal.structured || null
            }
        });

        // 5️⃣ Generate PDF from the selected vendor's structured JSON
        const pdfBase64 = await EmailService.generatePdfFromStructured(
            selectedProposal.structured
        );

        // 6️⃣ Send confirmation email to the vendor
        const subject = `Congratulations! You have been selected for RFP: ${selectedProposal.rfp.title}`;
        const message = `
      <p>Dear ${selectedProposal.vendor.name},</p>
      <p>Congratulations! Your proposal for <b>${selectedProposal.rfp.title}</b> has been selected.</p>
      <p>Please find attached your proposal details in PDF format.</p>
      <br>
      <p>Regards,<br>Procurement Team</p>
    `.trim();

        await EmailService.sendProposalEmail({
            vendor: selectedProposal.vendor,
            subject,
            message,
            pdfBase64,
            rfpId,
            status: "CLOSED"
        });

        // 7️⃣ Return updated RFP with proposals
        const updatedRFP = await prisma.rFP.findUnique({
            where: { rfpId },
            include: { proposals: true }
        });

        return updatedRFP;
    }
};
