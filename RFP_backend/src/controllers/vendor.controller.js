// src/controllers/vendor.controller.js

import {
    getAllVendorsService,
    createVendorService,
    updateVendorService,
    deleteVendorService
} from "../services/vendor.service.js";

/**
 * GET ALL VENDORS
 */
export const getAllVendorsController = async (req, res) => {
    const start = Date.now();
    try {
        const vendors = await getAllVendorsService();

        console.log(`[GET ALL VENDORS] Completed in ${Date.now() - start}ms`);

        return res.json({
            message: "Vendors fetched successfully",
            vendors
        });
    } catch (err) {
        console.error("GET ALL VENDORS ERROR:", err);
        console.log(`[GET ALL VENDORS] Failed in ${Date.now() - start}ms`);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * CREATE NEW VENDOR
 */
export const createVendorController = async (req, res) => {
    const start = Date.now();
    try {
        const { name, email, vendorType, contactNumber } = req.body;

        if (!name || !email || !vendorType) {
            return res.status(400).json({
                error: "name, email, and vendorType are required"
            });
        }

        const vendor = await createVendorService({
            name,
            email,
            vendorType,
            contactNumber
        });

        console.log(
            `[CREATE VENDOR] vendorId=${vendor.vendorId} Completed in ${Date.now() - start}ms`
        );

        return res.status(201).json({
            message: "Vendor created successfully",
            vendorId: vendor.vendorId
        });

    } catch (err) {
        console.error("CREATE VENDOR ERROR:", err);
        console.log(`[CREATE VENDOR] Failed in ${Date.now() - start}ms`);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * UPDATE VENDOR
 */
export const updateVendorController = async (req, res) => {
    const start = Date.now();
    try {
        const vendorId = Number(req.params.vendorId);

        if (isNaN(vendorId)) {
            return res.status(400).json({ error: "Invalid vendorId" });
        }

        const updated = await updateVendorService(vendorId, req.body);

        console.log(
            `[UPDATE VENDOR] vendorId=${vendorId} Completed in ${Date.now() - start}ms`
        );

        return res.json({
            message: "Vendor updated successfully",
            vendor: updated
        });

    } catch (err) {
        console.error("UPDATE VENDOR ERROR:", err);
        console.log(`[UPDATE VENDOR] vendorId=${req.params.vendorId} Failed in ${Date.now() - start}ms`);
        return res.status(500).json({ error: err.message });
    }
};

/**
 * DELETE (SOFT DELETE) VENDOR
 */
export const deleteVendorController = async (req, res) => {
    const start = Date.now();
    try {
        const vendorId = Number(req.params.vendorId);

        if (isNaN(vendorId)) {
            return res.status(400).json({ error: "Invalid vendorId" });
        }

        await deleteVendorService(vendorId);

        console.log(
            `[DELETE VENDOR] vendorId=${vendorId} Completed in ${Date.now() - start}ms`
        );

        return res.json({
            message: "Vendor deleted successfully"
        });

    } catch (err) {
        console.error("DELETE VENDOR ERROR:", err);
        console.log(`[DELETE VENDOR] vendorId=${req.params.vendorId} Failed in ${Date.now() - start}ms`);
        return res.status(500).json({ error: err.message });
    }
};
