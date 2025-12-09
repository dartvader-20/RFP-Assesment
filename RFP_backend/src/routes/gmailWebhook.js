// src/routes/gmailWebhook.js
import express from "express";
import prisma from "../db/prismaClient.js"; // adjust path
import { google } from "googleapis";

const router = express.Router();

// Middleware to parse JSON
router.use(express.json({ limit: "10mb" }));

router.post("/webhooks/gmail", async (req, res) => {

    try {
        const notification = req.body;
        console.log("Gmail push notification received:", notification);

        const historyId = notification.historyId;
        const userId = "me";
        const auth = new google.auth.GoogleAuth({
            scopes: ["https://www.googleapis.com/auth/gmail.modify"]
        });

        // Fetch messages since historyId
        const gmail = google.gmail({ version: "v1", auth });
        const historyRes = await gmail.users.history.list({
            userId,
            startHistoryId: historyId,
            historyTypes: ["messageAdded"],
        });

        const messages = historyRes.data.history?.flatMap(h => h.messages || []) || [];

        for (const msg of messages) {
            const messageRes = await gmail.users.messages.get({
                userId,
                id: msg.id,
                format: "full",
            });

            const message = messageRes.data;

            // Extract trackingId
            const header = message.payload.headers.find(h => h.name === "X-RFP-Tracking-ID");
            const trackingId =
                header?.value ||
                Buffer.from(message.payload.parts?.[0]?.body?.data || "", "base64").toString("utf-8").match(/RFP-\d+-VENDOR-\d+-PROPOSAL-\d+/)?.[0];

            if (!trackingId) continue;

            const proposalId = parseInt(trackingId.match(/PROPOSAL-(\d+)/)[1], 10);

            // Save to DB
            await prisma.proposalMessage.create({
                data: {
                    proposalId,
                    sender: "VENDOR",
                    rawMessage: Buffer.from(message.payload.parts?.[0]?.body?.data || "", "base64").toString("utf-8"),
                    attachmentUrl: null,
                },
            });

            await prisma.proposal.update({
                where: { proposalId },
                data: { status: "RECEIVED" },
            });

            console.log(`Processed vendor reply for proposal ${proposalId}`);
        }

        res.status(200).send("OK");
    } catch (err) {
        console.error("Webhook processing error:", err);
        res.status(500).send("Error");
    }
});

export default router;
