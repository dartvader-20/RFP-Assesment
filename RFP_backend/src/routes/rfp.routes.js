import express from "express";
import { getRFPController, createRFPController, updateRFPController, deleteRFPController } from "../controllers/rfp.controller.js";

const router = express.Router();

router.get("/", getRFPController);
router.post("/", createRFPController);
router.put("/", updateRFPController);
router.delete("/", deleteRFPController);

export default router;
