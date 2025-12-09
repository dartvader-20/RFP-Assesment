// src/controllers/email.controller.js
import EmailService from "../services/email.service.js";
import prisma from "../db/prismaClient.js";

// --------------------------------------------
// GET EMAIL DRAFT (NO SENDING)
// --------------------------------------------
export const getProposalEmailDraft = async (req, res) => {
    try {
        const { rfpId, vendorIds } = req.body;

        if (!rfpId || !vendorIds || vendorIds.length === 0) {
            return res.status(400).json({
                error: "rfpId and vendorIds[] are required"
            });
        }

        const draft = await EmailService.generateProposalDraft(
            rfpId,
            vendorIds
        );

        res.json({
            success: true,
            draft
        });

    } catch (error) {
        console.error("Draft generation error:", error);
        res.status(500).json({
            error: "Failed to generate email draft",
            details: error.toString()
        });
    }
};

// ---------------------------------------------------
// SEND FINAL PROPOSAL EMAIL (BACKEND GENERATES PDF)
// ---------------------------------------------------
export const sendFinalProposalEmail = async (req, res) => {
    try {
        const { rfpId, vendorIds, subject, message, status } = req.body;

        if (!rfpId || !vendorIds?.length || !message || !subject || !status) {
            return res.status(400).json({
                error: "rfpId, vendorIds[], subject, message, and status are required"
            });
        }

        // Fetch structured JSON for PDF
        const rfp = await prisma.rFP.findUnique({
            where: { rfpId: Number(rfpId) }
        });

        if (!rfp || !rfp.structured) {
            return res.status(404).json({ error: "RFP or structured data not found" });
        }

        // Generate PDF inside backend
        const pdfBase64 = await EmailService.generatePdfFromStructured(rfp.structured);

        // Fetch vendors
        const vendors = await prisma.vendor.findMany({
            where: { vendorId: { in: vendorIds }, isDeleted: false },
        });

        // Send email one-by-one
        for (const vendor of vendors) {
            await EmailService.sendProposalEmail({
                vendor,
                rfpId,
                subject,
                message,
                pdfBase64,
                status,
            });
        }

        res.json({ success: true, message: "Emails sent successfully" });

    } catch (error) {
        console.error("Failed to send proposal email:", error);
        res.status(500).json({
            error: "Failed to send emails",
            details: error.toString()
        });
    }
};
