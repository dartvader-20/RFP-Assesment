import express from "express";
import cors from "cors";
import rfpRoutes from "./routes/rfp.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import proposalRoutes from "./routes/proposals.routes.js";
import emailRoutes from "./routes/email.routes.js";
import gmailWebhookRoutes from "./routes/gmailWebhook.js"
import { googleAuthUrl } from "./routes/googleAuth.js"
import { googleAuthCallback } from "./routes/googleCallback.js"
import { gmailWebhook } from "./routes/googleWebhook.js";
import gmailWatch from "./routes/gmailWatch.js";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.json({ type: 'application/vnd.api+json' }));
app.use(cors());

app.use("/api/rfps", rfpRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/proposals", proposalRoutes);
app.use("/api/email", emailRoutes);
app.use("/", gmailWebhookRoutes);
app.get("/auth/google", googleAuthUrl);
app.get("/auth/callback", googleAuthCallback);
app.post("/webhook", gmailWebhook);
app.use("/api", gmailWatch);

export default app; 