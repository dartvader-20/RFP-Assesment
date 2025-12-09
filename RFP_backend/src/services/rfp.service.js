// src/services/rfp.service.js
import prisma from "../db/prismaClient.js";
import { generateStructuredRFP } from "./aiService.js";

export const getRFPService = async ({ rfpId, userId }) => {
    // --- Case 1: Fetch ONE RFP in FULL DETAIL ---
    if (rfpId) {
        return prisma.rFP.findUnique({
            where: { rfpId: Number(rfpId) },
            include: { proposals: true, chatMessages: true }
        });
    }

    // --- Case 2: Fetch LIST of simplified RFPs ---
    if (!userId) throw new Error("userId is required");

    return prisma.rFP.findMany({
        where: { userId: Number(userId), isDeleted: false },
        orderBy: { createdAt: "desc" },
        select: {
            rfpId: true,
            title: true,
            description: true,
            userId: true,
            createdAt: true,
            updatedAt: true,
            budget: true,
            deliveryDays: true,
            status: true
        }
    });
};

export const createRFPService = async (userId, userQuery) => {
    // STEP 1: Create empty RFP entry
    const rfp = await prisma.rFP.create({
        data: { userId },
    });

    // STEP 2: Generate structured JSON
    const structuredJson = await generateStructuredRFP(
        "Generate RFP details",
        userQuery,
        null
    );

    // Extract fields safely
    const { title, description, budget, deliveryDays } = structuredJson;

    // STEP 3: Update RFP with all fields
    const updatedRfp = await prisma.rFP.update({
        where: { rfpId: rfp.rfpId },
        data: {
            title: title || null,
            description: description || null,
            budget: budget || null,
            deliveryDays: deliveryDays || null,
            structured: structuredJson,
            updatedAt: new Date(), // update manually
        },
    });

    // STEP 4: Save chat message
    await prisma.rFPChatMessage.create({
        data: {
            rfpId: rfp.rfpId,
            userMessage: userQuery,
            assistantMessage: JSON.stringify(structuredJson),
        },
    });

    return updatedRfp;
};

export const updateRFPService = async ({ rfpId, userQuery }) => {
    console.log("\n==== UPDATE RFP SERVICE ====");
    const start = Date.now();

    try {
        if (!rfpId) throw new Error("rfpId is required");
        if (!userQuery) throw new Error("userQuery is required");

        console.log(`Updating RFP: ${rfpId}`);
        console.log("User Query:", userQuery);

        // STEP 1: Load existing RFP
        const existingRFP = await prisma.rFP.findFirst({
            where: { rfpId: Number(rfpId), isDeleted: false },
        });

        if (!existingRFP) {
            throw new Error(`RFP with id ${rfpId} not found`);
        }

        console.log("Previous structured JSON:", existingRFP.structured);

        // STEP 2: Ask AI to update structured JSON
        const updatedJson = await generateStructuredRFP(
            "Update RFP details",
            userQuery,
            existingRFP.structured
        );

        console.log("Updated JSON:", updatedJson);

        // STEP 3: Update RFP record
        const updatedRFP = await prisma.rFP.update({
            where: { rfpId: Number(rfpId) },
            data: {
                title: updatedJson.title ?? existingRFP.title,
                description: updatedJson.description ?? existingRFP.description,
                budget: updatedJson.budget ?? existingRFP.budget,
                deliveryDays: updatedJson.deliveryDays ?? existingRFP.deliveryDays,
                structured: updatedJson,
                updatedAt: new Date()
            }
        });

        // STEP 4: Log chat message
        await prisma.rFPChatMessage.create({
            data: {
                rfpId: Number(rfpId),
                userMessage: userQuery,
                assistantMessage: JSON.stringify(updatedJson)
            }
        });

        const duration = Date.now() - start;
        console.log(`RFP UPDATED SUCCESSFULLY | Duration: ${duration}ms`);

        return updatedRFP;

    } catch (err) {
        const duration = Date.now() - start;
        console.error(`UPDATE RFP ERROR | Duration: ${duration}ms`);
        console.error(err.message);
        throw err;
    }
};

export const deleteRFPService = async ({ rfpId, userId }) => {
    console.log("\n==== DELETE RFP SERVICE ====");
    const start = Date.now();

    if (!rfpId) throw new Error("rfpId is required");
    if (!userId) throw new Error("userId is required");

    try {
        // Make sure the RFP belongs to the user and exists
        const rfp = await prisma.rFP.findFirst({
            where: { rfpId: rfpId, userId, isDeleted: false },
        });

        if (!rfp) {
            throw new Error(`RFP not found or already deleted`);
        }

        // Soft delete by setting isDeleted = true
        const deletedRFP = await prisma.rFP.update({
            where: { rfpId },
            data: { isDeleted: true, updatedAt: new Date() },
        });

        const duration = Date.now() - start;
        console.log(`RFP SOFT-DELETED | Duration: ${duration}ms`);

        return deletedRFP;

    } catch (err) {
        const duration = Date.now() - start;
        console.error(`DELETE RFP ERROR | Duration: ${duration}ms`);
        console.error(err);
        throw err;
    }
};
