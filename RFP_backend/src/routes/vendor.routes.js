import express from "express";
import {
    getAllVendorsController,
    createVendorController,
    updateVendorController,
    deleteVendorController
} from "../controllers/vendor.controller.js";

const router = express.Router();

router.get("/", getAllVendorsController);
router.post("/", createVendorController);
router.put("/:vendorId", updateVendorController);
router.delete("/:vendorId", deleteVendorController);

export default router;
