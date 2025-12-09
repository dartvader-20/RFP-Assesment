// src/routes/gmailServices.js
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import { google } from "googleapis";
import dotenv from "dotenv";
import mammoth from "mammoth";
import prisma from "../db/prismaClient.js";
import { updateProposalFromVendorReply } from "../services/aiService.js";

dotenv.config();
let pdfParse;
const loadPdfParser = async () => {
    if (!pdfParse) {
        const mod = await import("pdf-parse");
        pdfParse = mod.default || mod;
    }
    return pdfParse;
};
// OAuth2 Client
const oauth2Client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
});

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const gmail = google.gmail("v1");

// Keep track of processed messages (in-memory dedupe)
const processedMessageIds = new Set();

// Temporary folder for attachments
const TEMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Base64 decoder (Gmail uses URL-safe base64)
const decodeBase64 = (data) =>
    Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
        "utf8"
    );

// Recursively extract a text body (text/plain preferred then html)
const extractBody = (payload) => {
    if (!payload) return "";
    if (payload.body?.data) return decodeBase64(payload.body.data);

    if (payload.parts && Array.isArray(payload.parts)) {
        for (const part of payload.parts) {
            if (
                part.mimeType === "text/plain" &&
                part.body?.data
            ) {
                return decodeBase64(part.body.data);
            }
        }
        // fallback to html or nested parts
        for (const part of payload.parts) {
            if (
                (part.mimeType === "text/html" || part.mimeType === "text/plain") &&
                part.body?.data
            ) {
                return decodeBase64(part.body.data);
            }
            if (part.parts) {
                const nested = extractBody(part);
                if (nested) return nested;
            }
        }
    }

    return "";
};

// Flatten parts and find attachment parts recursively
const collectAttachmentParts = (payload, out = []) => {
    if (!payload) return out;
    if (payload.parts && Array.isArray(payload.parts)) {
        for (const p of payload.parts) {
            if (p.filename && p.body?.attachmentId) {
                out.push(p);
            }
            if (p.parts) collectAttachmentParts(p, out);
        }
    }
    return out;
};

// Save attachment locally (async) and return descriptor
const saveAttachmentLocally = async (messageId, part) => {
    if (!part?.body?.attachmentId) return null;
    const attachmentRes = await gmail.users.messages.attachments.get({
        userId: "me",
        messageId,
        id: part.body.attachmentId,
        auth: oauth2Client,
    });

    const raw = attachmentRes.data?.data;
    if (!raw) return null;

    const fileData = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    const safeName = part.filename?.replace(/[^a-z0-9.\-_]/gi, "_") || `attachment-${Date.now()}`;
    const localPath = path.join(TEMP_DIR, `${Date.now()}-${safeName}`);
    await fsp.writeFile(localPath, fileData);
    return { filename: part.filename || safeName, path: localPath, mimeType: part.mimeType || "application/octet-stream" };
};

// Parse attachment to text (returns string). Always attempts cleanup.
const parseAttachmentFromFile = async (att) => {
    if (!att || !att.path) return "[No attachment]";
    try {
        const fileBuffer = await fsp.readFile(att.path);

        if (att.mimeType === "application/pdf" || att.filename?.toLowerCase().endsWith(".pdf")) {
            const parser = await loadPdfParser();
            const data = await parser(fileBuffer);
            return data?.text || "[PDF parsed but empty]";
        }

        if (
            att.mimeType ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
            att.filename?.toLowerCase().endsWith(".docx")
        ) {
            const result = await mammoth.extractRawText({ buffer: fileBuffer });
            return result.value || "[DOCX parsed but empty]";
        }

        if (att.mimeType.startsWith("image/")) {
            return `[Image attachment: ${att.filename}]`;
        }

        return `[Unsupported type: ${att.mimeType || "unknown"}]`;
    } catch (err) {
        console.error("Error parsing attachment:", err);
        return "[Error parsing attachment]";
    } finally {
        // cleanup file if exists
        try {
            if (att.path && fs.existsSync(att.path)) await fsp.unlink(att.path);
        } catch (e) {
            // non-fatal
            console.warn("Failed to cleanup attachment file:", att.path, e?.message || e);
        }
    }
};

// Extract header value (case-insensitive)
const extractHeaderValue = (message, name) =>
    (message.payload?.headers || []).find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

// Normalize the "From" header to extract just email address
const extractEmailFromHeader = (fromHeader) => {
    if (!fromHeader) return "";
    const match = fromHeader.match(/<([^>]+)>/);
    if (match) return match[1].toLowerCase();
    return fromHeader.split(/\s+/).find((tok) => tok.includes("@"))?.toLowerCase() || fromHeader.toLowerCase();
};

// Main function: process history records between startHistoryId → newHistoryId
export const processNewMessagesFromHistory = async (
    startHistoryId,
    newHistoryId,
    emailAddress,
    updateHistoryId
) => {
    try {
        console.log(`Fetching new messages from history ${startHistoryId} → ${newHistoryId}`);

        // Defensive: ensure startHistoryId exists and is <= newHistoryId
        if (!startHistoryId) {
            console.log("No startHistoryId provided — skipping processing");
            await updateHistoryId(emailAddress, newHistoryId);
            return;
        }

        // Get history - list may throw if startHistoryId is too old; handle gracefully
        let historyRes;
        try {
            historyRes = await gmail.users.history.list({
                userId: "me",
                startHistoryId,
                historyTypes: ["messageAdded"],
                auth: oauth2Client,
            });
        } catch (err) {
            console.error("Error listing Gmail history:", err?.message || err);
            // If the startHistoryId is expired, fallback to a safe strategy: update to newHistoryId and return.
            if (err?.code === 404 || /Invalid startHistoryId/.test(err?.message || "")) {
                console.warn("startHistoryId expired/invalid. Updating stored history to newHistoryId and skipping processing to avoid duplications.");
                await updateHistoryId(emailAddress, newHistoryId);
                return;
            }
            throw err;
        }

        const histories = historyRes.data.history || [];
        console.log(`Found ${histories.length} history records`);

        // iterate each history entry
        for (const history of histories) {
            if (!history.messagesAdded) continue;

            for (const added of history.messagesAdded) {
                const message = added.message;
                if (!message?.id) continue;

                // Basic in-memory dedupe
                if (processedMessageIds.has(message.id)) {
                    // console.log(`Skipping already processed message ${message.id}`);
                    continue;
                }

                try {
                    // fetch full message
                    const fullMessageRes = await gmail.users.messages.get({
                        userId: "me",
                        id: message.id,
                        format: "full",
                        auth: oauth2Client,
                    });

                    const msgData = fullMessageRes.data;
                    if (!msgData) {
                        console.warn("Empty message data for id", message.id);
                        continue;
                    }

                    // Skip non-INBOX messages and skip our own SENT copies
                    // labelIds may be undefined in rare cases; guard
                    const labels = msgData.labelIds || [];
                    if (!labels.includes("INBOX")) {
                        // not an inbound message
                        // console.log("Skipping message not in INBOX:", message.id, labels);
                        processedMessageIds.add(message.id);
                        continue;
                    }
                    if (labels.includes("SENT")) {
                        processedMessageIds.add(message.id);
                        continue;
                    }

                    const subject = extractHeaderValue(msgData, "Subject");
                    const fromRaw = extractHeaderValue(msgData, "From");
                    const fromEmail = extractEmailFromHeader(fromRaw);
                    const bodyText = extractBody(msgData.payload) || "";

                    // Collect attachments (handles nested parts)
                    const attachmentParts = collectAttachmentParts(msgData.payload, []);
                    const attachments = [];
                    for (const part of attachmentParts) {
                        try {
                            const saved = await saveAttachmentLocally(msgData.id, part);
                            if (saved) attachments.push(saved);
                        } catch (e) {
                            console.error("Failed saving attachment part:", e?.message || e);
                        }
                    }

                    // Parse attachments into text (concatenate)
                    let attachmentText = "";
                    for (const att of attachments) {
                        attachmentText += `\n\n--- Attachment: ${att.filename} ---\n`;
                        attachmentText += await parseAttachmentFromFile(att);
                    }

                    const fullContent = `${bodyText}\n${attachmentText}`.trim();

                    // Determine proposalId from tracking header OR subject (only as backup)
                    let proposalId;
                    const trackingHeaderVal = (msgData.payload?.headers || []).find(h => h.name?.toLowerCase() === "x-rfp-tracking-id")?.value;
                    if (trackingHeaderVal) {
                        const last = trackingHeaderVal.split("-").pop();
                        const parsed = parseInt(last, 10);
                        if (!Number.isNaN(parsed)) proposalId = parsed;
                    }

                    if (!proposalId && subject) {
                        const trackingMatch = subject.match(/RFP-(\d+)-VENDOR-(\d+)-PROPOSAL-(\d+)/i);
                        if (trackingMatch) {
                            proposalId = parseInt(trackingMatch[3], 10);
                        }
                    }

                    if (!proposalId) {
                        console.log("Cannot determine proposal ID for message", message.id, " — skipping");
                        processedMessageIds.add(message.id);
                        continue;
                    }

                    // Validate proposal exists & vendor matches the sender email
                    const proposal = await prisma.proposal.findUnique({
                        where: { proposalId },
                        include: { vendor: true },
                    });

                    if (!proposal) {
                        console.log(`Proposal ${proposalId} not found — skipping message ${message.id}`);
                        processedMessageIds.add(message.id);
                        continue;
                    }

                    // If vendor exists in DB, validate email (case-insensitive)
                    const vendorEmail = proposal.vendor?.email?.toLowerCase();
                    if (vendorEmail && fromEmail && vendorEmail !== fromEmail) {
                        console.log(`Sender email ${fromEmail} does not match vendor ${vendorEmail} for proposal ${proposalId} — skipping`);
                        processedMessageIds.add(message.id);
                        continue;
                    }

                    console.log(`📥 Vendor reply detected for proposal ${proposalId} (message ${message.id})`);

                    // Use AI service to parse structured data
                    let updatedStructured = null;
                    try {
                        updatedStructured = await updateProposalFromVendorReply(proposalId, fullContent, attachmentText);
                    } catch (aiErr) {
                        console.error("AI parsing failed:", aiErr?.message || aiErr);
                        // continue — we still store raw email
                    }

                    // Save the raw email + updated structured JSON (if any)
                    try {
                        await prisma.proposalMessage.create({
                            data: {
                                proposalId,
                                sender: "VENDOR",
                                rawMessage: fullContent,
                                structured: updatedStructured,
                            },
                        });

                        const updateData = {
                            status: "RECEIVED",
                            rawEmail: fullContent,
                        };
                        if (updatedStructured) updateData.structured = updatedStructured;

                        await prisma.proposal.update({
                            where: { proposalId },
                            data: updateData,
                        });

                        console.log(`💾 Updated proposal ${proposalId} with structured data`);
                    } catch (dbErr) {
                        console.error("DB update failed for proposal:", proposalId, dbErr?.message || dbErr);
                    }

                    // Mark as read (remove UNREAD)
                    try {
                        await gmail.users.messages.modify({
                            userId: "me",
                            id: message.id,
                            auth: oauth2Client,
                            requestBody: { removeLabelIds: ["UNREAD"] },
                        });
                    } catch (modErr) {
                        console.warn("Failed to mark message read:", message.id, modErr?.message || modErr);
                    }

                    // Add to processed set
                    processedMessageIds.add(message.id);
                } catch (err) {
                    console.error("Error processing message:", err?.message || err, "messageId:", message.id);
                    // still add to processed to avoid infinite retry loops for the same message
                    processedMessageIds.add(message.id);
                }
            }
        }

        // Update local history AFTER processing everything successfully
        try {
            await updateHistoryId(emailAddress, newHistoryId);
            console.log(`Updated historyId for ${emailAddress} -> ${newHistoryId}`);
        } catch (e) {
            console.error("Failed to update historyId:", e?.message || e);
        }
    } catch (error) {
        console.error("Error processing history:", error?.message || error);
    }
};

// small cleanup of processedMessageIds every hour — keep it lightweight
setInterval(() => {
    try {
        if (processedMessageIds.size > 2000) {
            const arr = Array.from(processedMessageIds).slice(-1000);
            processedMessageIds.clear();
            arr.forEach((id) => processedMessageIds.add(id));
            console.log("Cleaned up processed messages set");
        }
    } catch (e) {
        console.warn("Processed set cleanup error", e?.message || e);
    }
}, 60 * 60 * 1000); // 1 hour
