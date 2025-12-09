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

export const googleAuthUrl = (req, res) => {
  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/pubsub",
    "https://www.googleapis.com/auth/gmail.modify",
  ];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline", // important for refresh tokens
    scope: scopes,
    prompt: "consent",
  });

  res.redirect(url);
};
