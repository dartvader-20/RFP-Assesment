import fs from "fs/promises";
import path from "path";
import { processNewMessagesFromHistory } from "./gmailServices.js";

export const gmailWebhook = async (req, res) => {
    if (!req.body.message || !req.body.message.data) {
        return res.status(200).send("Ignored");
    }

    let decoded;

    try {
        decoded = JSON.parse(
            Buffer.from(req.body.message.data, "base64").toString("utf8")
        );
    } catch (e) {
        console.warn("⚠ Ignoring non-JSON Pub/Sub message");
        return res.status(200).send("Ignored");
    }

    console.log("Decoded PubSub JSON:", decoded);
    try {
        const message = req.body?.message;

        if (!message?.data) {
            console.log("No message data in request");
            return res.status(400).send("Invalid Pub/Sub message");
        }

        const dataBuffer = Buffer.from(message.data, "base64").toString("utf-8");

        // FIX: handle non-JSON messages
        let notification;
        try {
            notification = JSON.parse(dataBuffer);
        } catch (err) {
            console.log("⚠ Invalid JSON received:", dataBuffer);
            return res.status(200).send("Ignored non-JSON message");
        }

        const emailAddress = notification.emailAddress;
        const newHistoryId = notification.historyId;

        const historyData = await readHistoryIds();
        const startHistoryId = historyData[emailAddress];

        console.log("📨 Valid Gmail webhook received:", notification);

        if (startHistoryId) {
            await processNewMessagesFromHistory(
                startHistoryId,
                newHistoryId,
                emailAddress,
                writeHistoryId
            );
        } else {
            console.log("First webhook for this user. Saving initial historyID.");
            await writeHistoryId(emailAddress, newHistoryId);
        }

        return res.status(200).send("OK");
    } catch (error) {
        console.error("Webhook error:", error);
        return res.status(500).send("Server error");
    }
};

const readHistoryIds = async () => {
    const HISTORY_FILE = path.join(process.cwd(), "src/db/history.json");
    try {
        const data = await fs.readFile(HISTORY_FILE, "utf-8");
        return JSON.parse(data);
    } catch (error) {
        if (error.code === "ENOENT") return {};
        console.error("Error reading history file:", error);
        return {};
    }
};

const writeHistoryId = async (emailAddress, historyId) => {
    const HISTORY_FILE = path.join(process.cwd(), "src/db/history.json");

    try {
        const historyData = await readHistoryIds();
        historyData[emailAddress] = historyId;

        await fs.writeFile(
            HISTORY_FILE,
            JSON.stringify(historyData, null, 2),
            "utf-8"
        );

        console.log(`Updated historyId for ${emailAddress}`);
    } catch (error) {
        console.error("Error writing history file:", error);
    }
};
