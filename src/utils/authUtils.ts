// utils/authUtils.ts
import { Request } from "express";
import { UserRole } from "../constants/enums";

/**
 * Extracts instituteId from authenticated user's token
 * @param req - Express Request object with authenticated user data
 * @returns instituteId string
 * @throws Error if instituteId cannot be determined or user is unauthorized
 */
export const getInstituteId = (req: Request): string => {
  if (req.userRole === UserRole.PRINCIPAL) {
    // For Principal, use their own ID as instituteId
    return req.user!.id.toString();
  } else if (req.userRole === UserRole.TEACHER) {
    // For Teacher, use the instituteId from their token
    if (!req.instituteId) {
      throw new Error("Institute ID not found in token");
    }
    return req.instituteId;
  } else {
    throw new Error("Unauthorized role");
  }
};

/**
 * Validates if the authenticated user can access a specific institute
 * @param req - Express Request object with authenticated user data
 * @param targetInstituteId - The institute ID to validate access for
 * @returns boolean indicating if access is allowed
 */
export const canAccessInstitute = (
  req: Request,
  targetInstituteId: string
): boolean => {
  try {
    const userInstituteId = getInstituteId(req);
    return userInstituteId === targetInstituteId;
  } catch (error) {
    return false;
  }
};

/**
 * Checks if the user is a SuperAdmin (has access to all institutes)
 * @param req - Express Request object with authenticated user data
 * @returns boolean indicating if user is SuperAdmin
 */
export const isSuperAdmin = (req: Request): boolean => {
  return req.userRole === UserRole.SUPER_ADMIN;
};

/**
 * Gets the user's role for permission checking
 * @param req - Express Request object with authenticated user data
 * @returns UserRole or null if not authenticated
 */
export const getUserRole = (req: Request): UserRole | null => {
  return req.userRole || null;
};

/**
 * Validates resource ownership for institute-specific resources
 * Used for operations that need to ensure the resource belongs to the user's institute
 * @param req - Express Request object with authenticated user data
 * @param resourceInstituteId - The institute ID of the resource being accessed
 * @returns boolean indicating if the user can access this resource
 */
export const validateResourceOwnership = (
  req: Request,
  resourceInstituteId: string
): boolean => {
  // SuperAdmin can access any resource
  if (isSuperAdmin(req)) {
    return true;
  }

  // For other roles, check institute ownership
  try {
    const userInstituteId = getInstituteId(req);
    return userInstituteId === resourceInstituteId;
  } catch (error) {
    return false;
  }
};

/**
 * Creates a standardized "not found or access denied" error
 * This prevents information leakage about resource existence
 * @param resourceType - Type of resource (e.g., "Question set", "Course")
 * @returns Error object with standardized message
 */
export const createAccessDeniedError = (
  resourceType: string = "Resource"
): Error => {
  return new Error(`${resourceType} not found or access denied`);
};

/**
 * Higher-order function to wrap controller functions with institute validation
 * @param controllerFn - The controller function to wrap
 * @returns Wrapped controller function with automatic institute validation
 */
export const withInstituteValidation = (controllerFn: Function) => {
  return async (req: Request, res: any, next: any) => {
    try {
      // Validate that user has a valid institute association
      getInstituteId(req);
      return await controllerFn(req, res, next);
    } catch (error) {
      res.status(403);
      throw error;
    }
  };
};
