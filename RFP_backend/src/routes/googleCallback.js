import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const oauth2Client = new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI, // must match your route
});

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

export const googleAuthCallback = async (req, res) => {
    const code = req.query.code; // no type assertion needed in JS

    try {
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Store tokens securely (DB, Vault, etc.)
        console.log("Access Token:", tokens.access_token);
        console.log("Refresh Token:", tokens.refresh_token);

        res.send("Google OAuth successful. Tokens saved.");
    } catch (error) {
        console.error("Error exchanging code for tokens:", error);
        res.status(500).send("Failed to complete Google OAuth.");
    }
};
