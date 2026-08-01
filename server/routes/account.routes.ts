import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import {
  addAccounts,
  disconnectAccounts,
  getAccounts,
} from "../controllers/accounts.controller.js";

const accountRouter = express.Router();

accountRouter.get("/", protect, getAccounts);
accountRouter.post("/", protect, addAccounts);
accountRouter.delete("/:id", protect, disconnectAccounts);

export default accountRouter;
