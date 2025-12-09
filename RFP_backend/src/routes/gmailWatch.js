import express from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const router = express.Router();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

router.get("/start-gmail-watch", async (req, res) => {
    try {
        const gmail = google.gmail({ version: "v1", auth: oauth2Client });

        const response = await gmail.users.watch({
            userId: "me",
            requestBody: {
                topicName: "projects/gmail-rfp-topic/topics/gmail-rfp-topic",
                labelIds: ["INBOX"],
            },
        });

        console.log("WATCH ACTIVATED:", response.data);

        res.json({
            message: "Gmail watch activated",
            data: response.data,
        });
    } catch (error) {
        console.error("Error starting Gmail watch:", error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
