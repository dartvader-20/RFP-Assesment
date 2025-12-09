// src/services/vendor.service.js
import prisma from "../db/prismaClient.js";

/**
 * GET ALL ACTIVE VENDORS
 */
export const getAllVendorsService = async () => {
    return await prisma.vendor.findMany({
        where: { isDeleted: false },
        orderBy: { vendorId: "asc" }
    });
};

/**
 * CREATE A NEW VENDOR
 */
export const createVendorService = async (data) => {
    const { name, email, vendorType, contactNumber } = data;

    return await prisma.vendor.create({
        data: {
            name,
            email,
            vendorType,
            contactNumber
        }
    });
};

/**
 * UPDATE A VENDOR BY ID
 */
export const updateVendorService = async (vendorId, data) => {
    return await prisma.vendor.update({
        where: { vendorId },
        data
    });
};

/**
 * SOFT DELETE A VENDOR
 */
export const deleteVendorService = async (vendorId) => {
    return await prisma.vendor.update({
        where: { vendorId },
        data: { isDeleted: true }
    });
};
