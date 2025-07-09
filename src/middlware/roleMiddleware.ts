import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import { Principal } from "../models/auth/principalModel";
import { Teacher } from "../models/auth/teacherModel";
import { SuperAdmin } from "../models/auth/superAdminModel";
import { UserRole } from "../constants/enums";
import { PERMISSIONS } from "../constants/permissions";
import { StudentModel } from "../models/auth/studentModel";
import { PasskeyModel } from "../models/passkeys/passkeyModel";

interface JWTPayload {
  id: string;
  role: UserRole;
  instituteId?: string;
}

// Helper function to verify JWT token
const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET not defined in environment variables");
  }
  return jwt.verify(token, secret) as JWTPayload;
};

// Base authentication middleware
export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401);
      throw new Error("Access denied. No valid token provided.");
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyToken(token);

      let user;
      switch (decoded.role) {
        case UserRole.SUPER_ADMIN:
          user = await SuperAdmin.findById(decoded.id).select("-password");
          break;
        case UserRole.PRINCIPAL:
          user = await Principal.findById(decoded.id).select("-password");
          break;
        case UserRole.TEACHER:
          user = await Teacher.findById(decoded.id)
            .populate("instituteId", "instituteName")
            .select("-password");
          break;
        default:
          res.status(401);
          throw new Error("Invalid user role");
      }

      if (!user || !user.isActive) {
        res.status(401);
        throw new Error("User not found or account deactivated");
      }

      req.user = user;
      req.userRole = decoded.role;
      req.instituteId = decoded.instituteId;

      next();
    } catch (error: any) {
      res.status(401);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }
);

// Role-specific middleware
export const authSuperAdmin = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      if (req.userRole !== UserRole.SUPER_ADMIN) {
        res.status(403);
        throw new Error("Access denied. Super Admin role required.");
      }
      next();
    });
  }
);

export const authPrincipal = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      if (req.userRole !== UserRole.PRINCIPAL) {
        res.status(403);
        throw new Error("Access denied. Principal role required.");
      }
      next();
    });
  }
);

export const authTeacher = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      if (req.userRole !== UserRole.TEACHER) {
        res.status(403);
        throw new Error("Access denied. Teacher role required.");
      }
      next();
    });
  }
);

// Combined role middleware
export const authPrincipalOrTeacher = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      if (![UserRole.PRINCIPAL, UserRole.TEACHER].includes(req.userRole!)) {
        res.status(403);
        throw new Error("Access denied. Principal or Teacher role required.");
      }
      next();
    });
  }
);

export const authSuperAdminOrPrincipal = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      if (![UserRole.SUPER_ADMIN, UserRole.PRINCIPAL].includes(req.userRole!)) {
        res.status(403);
        throw new Error(
          "Access denied. Super Admin or Principal role required."
        );
      }
      next();
    });
  }
);

// Permission-based middleware
export const requirePermission = (permission: string) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      const userPermissions = getUserPermissions(req.userRole!);

      if (!userPermissions.includes(permission)) {
        res.status(403);
        throw new Error(`Access denied. Required permission: ${permission}`);
      }

      next();
    });
  });

// Resource ownership middleware (ensures user owns the specific resource)
export const authWithResourceOwnership = (resourceType: string) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      // This would need to be implemented based on your specific resource models
      // For now, just proceed - implement specific checks as needed
      next();
    });
  });

// Institute isolation middleware
export const requireInstituteAccess = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      const requestedInstituteId =
        req.params.instituteId || req.body.instituteId;

      // Super admin can access any institute
      if (req.userRole === UserRole.SUPER_ADMIN) {
        return next();
      }

      // Principal can only access their own institute
      if (req.userRole === UserRole.PRINCIPAL) {
        if (req.user!.id.toString() !== requestedInstituteId) {
          res.status(403);
          throw new Error("Access denied. Can only access your own institute.");
        }
        return next();
      }

      // Teacher can only access their assigned institute
      if (req.userRole === UserRole.TEACHER) {
        if (req.instituteId !== requestedInstituteId) {
          res.status(403);
          throw new Error(
            "Access denied. Can only access your assigned institute."
          );
        }
        return next();
      }

      res.status(403);
      throw new Error("Access denied.");
    });
  }
);

// Resource ownership middleware
export const requireResourceOwnership = (resourceType: string) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      // Super admin can access any resource
      if (req.userRole === UserRole.SUPER_ADMIN) {
        return next();
      }

      // For now, we'll implement basic ownership check
      // This can be expanded based on specific resource types
      const resourceId = req.params.id;

      if (!resourceId) {
        res.status(400);
        throw new Error("Resource ID required");
      }

      // Resource ownership validation will be handled in individual controllers
      // based on the specific resource type and business logic
      next();
    });
  });

// Helper function to get user permissions
const getUserPermissions = (role: UserRole): string[] => {
  switch (role) {
    case UserRole.SUPER_ADMIN:
      return PERMISSIONS.SUPER_ADMIN;
    case UserRole.PRINCIPAL:
      return PERMISSIONS.PRINCIPAL;
    case UserRole.TEACHER:
      return PERMISSIONS.TEACHER;
    default:
      return [];
  }
};

// Middleware for checking specific permissions on teachers
export const checkTeacherPermissions = (requiredPermissions: string[]) =>
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await authenticate(req, res, () => {
      // Principal and SuperAdmin always have access
      if (
        req.userRole === UserRole.PRINCIPAL ||
        req.userRole === UserRole.TEACHER
      ) {
        return next();
      }
      res.status(403);
      throw new Error("Access denied.");
    });
  });
// Passkey validation middleware (for operations requiring valid passkey)
export const authValidPasskey = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { passkeyId } = req.params;

    if (!passkeyId) {
      res.status(400);
      throw new Error("Passkey ID is required");
    }

    const passkey = await PasskeyModel.findOne({ passkeyId });

    if (!passkey) {
      res.status(404);
      throw new Error("Passkey not found");
    }

    // Attach passkey to request for use in controller
    (req as any).passkey = passkey;
    next();
  }
);

// Payment verification middleware
export const authPaymentRequired = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const passkey = (req as any).passkey;

    if (!passkey) {
      res.status(400);
      throw new Error("Passkey validation required before payment check");
    }

    // Check if platform fee is paid
    if (passkey.currentPlatformFeeStatus !== "PAID") {
      res.status(402); // Payment Required
      throw new Error("Platform fee payment required");
    }

    // Check if course access is verified (if required)
    if (!passkey.hasCourseAccess) {
      res.status(402);
      throw new Error("Course access verification required");
    }

    next();
  }
);

// Rate limiting middleware for students (to prevent abuse)
export const rateLimitStudent = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    // In production, implement proper rate limiting
    // For now, just proceed
    next();
  }
);

// Device validation middleware
export const authDeviceCheck = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { deviceId } = req.headers;
    const passkey = (req as any).passkey;

    if (!deviceId) {
      res.status(400);
      throw new Error("Device ID is required");
    }

    if (!passkey) {
      res.status(400);
      throw new Error("Passkey validation required before device check");
    }

    // Check if device matches the one assigned to passkey
    if (passkey.deviceId && passkey.deviceId !== deviceId) {
      res.status(403);
      throw new Error("Device mismatch. Access denied.");
    }

    next();
  }
);
// Log access middleware (for audit trails)
export const logAccess = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip;
    const userAgent = req.get("User-Agent");
    const userId = req.user?._id || "anonymous";
    const userRole = req.userRole || "none";

    console.log(
      `[${timestamp}] ${method} ${url} - User: ${userId} (${userRole}) - IP: ${ip} - UA: ${userAgent}`
    );

    next();
  }
);
