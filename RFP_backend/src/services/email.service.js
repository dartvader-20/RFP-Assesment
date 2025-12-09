// src/services/email.service.js
import nodemailer from "nodemailer";
import prisma from "../db/prismaClient.js";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    // ---------------------------------------------------
    // Backend PDF Generator using structured JSON
    // ---------------------------------------------------
    async generatePdfFromStructured(structured) {
        const doc = new jsPDF();

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.text(`RFP: ${structured.title}`, 14, 20);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(`Description: ${structured.description}`, 14, 30);
        doc.text(`Budget: $${structured.budget}`, 14, 40);
        doc.text(`Delivery Days: ${structured.deliveryDays}`, 14, 50);

        // Items Table
        autoTable(doc, {
            startY: 60,
            head: [["#", "Item Name", "Quantity", "Specifications"]],
            body: structured.items.map((item, idx) => [
                idx + 1,
                item.name,
                item.quantity,
                Object.entries(item.specifications || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("\n")
            ])
        });

        // Terms
        let finalY = doc.lastAutoTable?.finalY || 80;
        doc.setFont("helvetica", "bold");
        doc.text("Terms & Conditions:", 14, finalY + 10);

        doc.setFont("helvetica", "normal");
        (structured.terms || []).forEach((term, i) => {
            doc.text(`${i + 1}. ${term}`, 16, finalY + 20 + i * 7);
        });

        return doc.output("datauristring").split(",")[1]; // return pure base64
    }
    // ---------------------------------------------------
    // GENERATES EMAIL DRAFT (NO PDF, NO SENDING)
    // ---------------------------------------------------
    async generateProposalDraft(rfpId, vendorIds) {
        const rfp = await prisma.rFP.findUnique({
            where: { rfpId: Number(rfpId) },
        });

        if (!rfp) throw new Error("RFP not found");

        const vendors = await prisma.vendor.findMany({
            where: { vendorId: { in: vendorIds }, isDeleted: false },
        });

        const subject = `Request for Proposal: ${rfp.title}`;
        const message = `
<p style="margin:0 0 10px 0;">Dear Vendor,</p>

<p style="margin:0 0 10px 0;">
  Please find attached the RFP details for <b>${rfp.title}</b>.
</p>

<p style="margin:0 0 15px 0;">
  Kindly review and share your quotation.
</p>

<p style="margin:0;">
  Regards,<br>
  Procurement Team
</p>
`.trim();

        // We now return structuredJson directly to frontend
        return {
            rfp,
            vendors,
            subject,
            message,
            structuredJson: rfp.structured
        };
    }

    // ---------------------------------------------------
    // SEND EMAIL (PDF COMES FROM FRONTEND)
    // ---------------------------------------------------
    async sendProposalEmail({ vendor, subject, message, pdfBase64, rfpId, status }) {

        // STEP 1 → Find or create proposal first
        let proposal = await prisma.proposal.findFirst({
            where: {
                rfpId,
                vendorId: vendor.vendorId,
                isDeleted: false
            }
        });

        if (!proposal) {
            proposal = await prisma.proposal.create({
                data: {
                    rfpId,
                    vendorId: vendor.vendorId,
                    status: "PENDING"
                }
            });
        }

        // STEP 2 → Generate trackingId AFTER proposal is created
        const trackingId = `RFP-${rfpId}-VENDOR-${vendor.vendorId}-PROPOSAL-${proposal.proposalId}`;
        const subjectWithTracking = `${subject} [Tracking: ${trackingId}]`;
        // STEP 3 → Save trackingId to DB
        await prisma.proposal.update({
            where: { proposalId: proposal.proposalId },
            data: { trackingId }
        });

        // STEP 4 → Email options WITH tracking header + footer
        const mailOptions = {
            from: process.env.MAIL_FROM,
            to: vendor.email,
            subject: subjectWithTracking,
            html:
                message +
                `<br><br><small style="opacity:0.5">Ref ID: ${trackingId}</small>`,
            headers: {
                "X-RFP-Tracking-ID": trackingId
            },
            attachments: [
                {
                    filename: "proposal.pdf",
                    content: Buffer.from(pdfBase64, "base64"),
                },
            ],
        };

        // STEP 5 → Send email
        const emailResult = await this.transporter.sendMail(mailOptions);
        // step 6 -> update status
        if (status) {
            await prisma.rFP.update({
                where: { rfpId },
                data: { status }
            });
        }
        // STEP 7 → Log message in ProposalMessage table
        await prisma.proposalMessage.create({
            data: {
                proposalId: proposal.proposalId,
                sender: "BUYER",
                rawMessage: message,
                attachmentUrl: null
            }
        });

        return emailResult;
    }
}

export default new EmailService();
