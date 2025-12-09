import { PubSub } from "@google-cloud/pubsub";
import { google } from "googleapis";
import prisma from "./db/prismaClient.js"; // your Prisma client
import fs from "fs/promises";
import path from "path";

const TOPIC_NAME = "projects/gmail-rfp-topic/topics/gmail-rfp-topic";
const SUBSCRIPTION_NAME = "gmail-rfp-sub";
const TOKEN_PATH = path.join(process.cwd(), "token.json");

// Load saved OAuth credentials
async function loadAuth() {
    try {
        const content = await fs.readFile(TOKEN_PATH);
        const credentials = JSON.parse(content);
        return google.auth.fromJSON(credentials);
    } catch (err) {
        console.error("No saved credentials found:", err);
        return null;
    }
}

// Gmail helper to fetch messages after a historyId
async function fetchNewMessages(auth, startHistoryId) {
    const gmail = google.gmail({ version: "v1", auth });

    const res = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        historyTypes: ["messageAdded"],
    });

    const messages = res.data.history?.flatMap(h => h.messages || []) || [];
    return messages;
}

// Fetch message content
async function getMessage(auth, messageId) {
    const gmail = google.gmail({ version: "v1", auth });
    const res = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
    });
    return res.data;
}

// Parse trackingId from headers or body
function extractTrackingId(message) {
    // Check headers first
    const header = message.payload.headers.find(
        h => h.name === "X-RFP-Tracking-ID"
    );
    if (header) return header.value;

    // Fallback: search in body (simple regex)
    const body = Buffer.from(
        message.payload.parts?.[0]?.body?.data || "",
        "base64"
    ).toString("utf-8");

    const match = body.match(/RFP-\d+-VENDOR-\d+-PROPOSAL-\d+/);
    return match ? match[0] : null;
}

// Process a single email
async function processEmail(auth, messageId) {
    const message = await getMessage(auth, messageId);
    const trackingId = extractTrackingId(message);
    if (!trackingId) return console.log("No trackingId found for email", messageId);

    // Parse proposalId from trackingId
    const match = trackingId.match(/PROPOSAL-(\d+)/);
    if (!match) return;
    const proposalId = parseInt(match[1], 10);

    // Store in DB
    await prisma.proposalMessage.create({
        data: {
            proposalId,
            sender: "VENDOR",
            rawMessage: Buffer.from(message.payload.parts?.[0]?.body?.data || "", "base64").toString("utf-8"),
            attachmentUrl: null,
        },
    });

    // Update proposal status
    await prisma.proposal.update({
        where: { proposalId },
        data: { status: "RECEIVED" },
    });

    console.log(`Processed vendor reply for proposal ${proposalId}`);
}

// Start Pub/Sub listener
async function startListener() {
    const auth = await loadAuth();
    if (!auth) return;

    const pubsub = new PubSub();
    const subscription = pubsub.subscription(SUBSCRIPTION_NAME);

    subscription.on("message", async (message) => {
        try {
            const data = JSON.parse(message.data.toString());
            console.log("New notification received:", data);

            const historyId = data.historyId;
            const newMessages = await fetchNewMessages(auth, historyId);

            for (const msg of newMessages) {
                await processEmail(auth, msg.id);
            }

            message.ack();
        } catch (err) {
            console.error("Error processing message:", err);
        }
    });

    subscription.on("error", (err) => {
        console.error("Pub/Sub subscription error:", err);
    });

    console.log("Listening for vendor replies...");
}

startListener();
