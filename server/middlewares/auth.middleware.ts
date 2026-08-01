import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export interface AuthRequest extends Request {
  user?: any;
}

export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {

  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No Authorization Header" });
    }

    const token = authHeader.replace("Bearer ", "");

    const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";
   

    const decoded = jwt.verify(token.trim(), JWT_SECRET) as { id: string };

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (err: any) {
    console.error(err);
    return res.status(401).json({
      message: err.message,
    });
  }
};
