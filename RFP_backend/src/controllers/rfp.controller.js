import * as rfpService from '../services/rfp.service.js';

export const getRFPController = async (req, res) => {
    console.log("\n==== GET RFP REQUEST ====");
    console.log("Query Params:", req.query);

    const start = Date.now();

    try {
        const { rfpId, userId } = req.query;

        console.log(`Fetching RFP... rfpId=${rfpId || "NULL"}, userId=${userId || "NULL"}`);

        const rfp = await rfpService.getRFPService({ rfpId, userId });

        const duration = Date.now() - start;
        console.log(`RFP Fetch Success | Duration: ${duration}ms`);

        res.json(rfp);
    } catch (err) {
        const duration = Date.now() - start;

        console.error(`GET RFP ERROR | Duration: ${duration}ms`);
        console.error("Error Message:", err.message);
        console.error(err.stack);

        res.status(400).json({ error: err.message });
    }
};

export const createRFPController = async (req, res) => {
    console.log("\n==== CREATE RFP REQUEST ====");
    console.log("Request Body:", req.body);

    const start = Date.now();

    try {
        const userIdNumber = Number(req.body.userId);
        const { userQuery } = req.body;

        if (isNaN(userIdNumber)) {
            const duration = Date.now() - start;
            console.warn(`Invalid userId provided | Duration: ${duration}ms`);
            return res.status(400).json({ error: "userId must be a number" });
        }

        console.log("Creating RFP for User:", userIdNumber);
        console.log("User Query:", userQuery);

        // This returns full structured RFP including rfpId
        const structuredRFP = await rfpService.createRFPService(
            userIdNumber,
            userQuery
        );

        const duration = Date.now() - start;
        console.log(`RFP Created Successfully | Duration: ${duration}ms`);
        console.log("Structured JSON:", structuredRFP);

        return res.status(201).json({
            message: "RFP created successfully",
            rfpId: structuredRFP.rfpId,  // <-- extract only the ID
        });

    } catch (err) {
        const duration = Date.now() - start;

        console.error(`CREATE RFP ERROR | Duration: ${duration}ms`);
        console.error("Error Message:", err.message);
        console.error(err.stack);

        return res.status(500).json({ error: err.message });
    }
};

export const updateRFPController = async (req, res) => {
    const start = Date.now();
    console.log("==== UPDATE RFP CONTROLLER START ====");

    try {
        const { rfpId, userId } = req.query;
        const { userQuery } = req.body;

        console.log("Query Params:", req.query);
        console.log("Body:", req.body);

        if (!rfpId || isNaN(Number(rfpId))) {
            return res.status(400).json({ error: "rfpId must be a number" });
        }

        if (!userId || isNaN(Number(userId))) {
            return res.status(400).json({ error: "userId must be a number" });
        }

        if (!userQuery) {
            return res.status(400).json({ error: "userQuery is required" });
        }

        const updated = await rfpService.updateRFPService({
            rfpId: Number(rfpId),
            userId: Number(userId),
            userQuery,
        });

        const duration = Date.now() - start;
        console.log(`UPDATE RFP SUCCESS | Duration: ${duration}ms`);
        res.json({ message: "RFP updated successfully" });

    } catch (err) {
        const duration = Date.now() - start;
        console.log(`UPDATE RFP ERROR | Duration: ${duration}ms`);
        console.error(err);

        res.status(500).json({ error: err.message });
    }
};

export const deleteRFPController = async (req, res) => {
    const start = Date.now();
    console.log("==== DELETE RFP CONTROLLER START ====");

    try {
        const { rfpId, userId } = req.query;

        console.log("Query Params:", req.query);

        if (!rfpId || isNaN(Number(rfpId))) {
            return res.status(400).json({ error: "rfpId must be a number" });
        }

        if (!userId || isNaN(Number(userId))) {
            return res.status(400).json({ error: "userId must be a number" });
        }

        await rfpService.deleteRFPService({
            rfpId: Number(rfpId),
            userId: Number(userId)
        });

        const duration = Date.now() - start;
        console.log(`DELETE RFP SUCCESS | Duration: ${duration}ms`);

        res.json({
            success: true,
            message: `RFP with id ${rfpId} has been deleted successfully.`,
            duration: `${duration}ms`
        });

    } catch (err) {
        const duration = Date.now() - start;
        console.log(`DELETE RFP ERROR | Duration: ${duration}ms`);
        console.error(err);

        res.status(500).json({
            error: err.message,
            duration: `${duration}ms`
        });
    }
};
