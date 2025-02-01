import jwt from "jsonwebtoken";
import logger from "./logger";

export const generateToken = (id: string): string => {
  // Verify secret exists
  if (!process.env.ACCESS_TOKEN_SECRET) {
    logger.error("JWT secret is not configured");
    throw new Error("JWT secret is not configured");
  }

  try {
    const token = jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET, {
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
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as jwt.JwtPayload;
};
