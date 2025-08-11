import jwt from "jsonwebtoken";
import logger from "./logger";

export const generateToken = (id: string): string => {
  // Verify secret exists
  if (!process.env.JWT_SECRET) {
    logger.error("JWT secret is not configured");
    throw new Error("JWT secret is not configured");
  }

  try {
    const token = jwt.sign({ id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    // Log token generation (first few characters only)
    logger.debug("Token generated successfully:", {
      id,
      tokenPrefix: token.substring(0, 10) + "...",
    });

    return token;
  } catch (error) {
    logger.error("Token generation failed:", error);
    throw new Error("Failed to generate authentication token");
  }
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as jwt.JwtPayload;
};

// New function specifically for student tokens with passkey info
export const generateStudentToken = (
  studentId: string,
  passkeyId: string
): string => {
  if (!process.env.JWT_SECRET) {
    logger.error("JWT secret is not configured");
    throw new Error("JWT secret is not configured");
  }

  try {
    const payload = {
      id: studentId,
      role: "STUDENT",
      passkeyId: passkeyId,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    logger.debug("Student token generated successfully:", {
      studentId,
      passkeyId,
      tokenPrefix: token.substring(0, 10) + "...",
    });

    return token;
  } catch (error) {
    logger.error("Student token generation failed:", error);
    throw new Error("Failed to generate student authentication token");
  }
};
