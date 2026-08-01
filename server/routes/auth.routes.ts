import { Router } from "express";
import { LoginUser, registerUser } from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", registerUser);
authRouter.post("/login", LoginUser);

export default authRouter;
