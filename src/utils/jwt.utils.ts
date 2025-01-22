import jwt from "jsonwebtoken";

export const generateToken = (id: string): string => {
  return jwt.sign({ id }, process.env.ACCESS_TOKEN_SECRET!, {
    expiresIn: "30d",
  });
};

export const verifyToken = (token: string): jwt.JwtPayload => {
  return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as jwt.JwtPayload;
};
