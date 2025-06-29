import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { SuperAdmin } from "../models/auth/superAdminModel";
import { UserRole } from "../constants/enums";

interface JwtPayload {
  id: string;
  role: UserRole;
}

// @desc    Protect SuperAdmin routes
export const protectSuperAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    let token: string | undefined;

    // Check for token in cookies or headers
    if (req.cookies?.superAdminToken) {
      token = req.cookies.superAdminToken;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }

    try {
      // Verify token
      const secret = process.env.JWT_SECRET;
      if (!secret) throw new Error("JWT_SECRET not defined");

      const decoded = jwt.verify(token, secret) as JwtPayload;

      // Verify it's a SuperAdmin token
      if (decoded.role !== UserRole.SUPER_ADMIN) {
        res.status(403);
        throw new Error("Access denied - SuperAdmin only");
      }

      // Get SuperAdmin from token
      const superAdmin = await SuperAdmin.findById(decoded.id).select(
        "-password"
      );

      if (!superAdmin || !superAdmin.isActive) {
        res.status(401);
        throw new Error("Not authorized, user not found or inactive");
      }

      req.user = superAdmin;
      req.userRole = UserRole.SUPER_ADMIN;
      next();
    } catch (error) {
      res.status(401);
      throw new Error("Not authorized, token failed");
    }
  }
);

// @desc    Ensure user is SuperAdmin (additional check)
export const ensureSuperAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    if (req.userRole !== UserRole.SUPER_ADMIN) {
      res.status(403);
      throw new Error("Access denied - SuperAdmin privileges required");
    }
    next();
  }
);
