import { verifyToken } from "../utils/auth";
import { ApiResponse } from "motia";

export function requireAuth(req: any): ApiResponse<401, { message: string }> | null {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { status: 401, body: { message: "No token provided" } };
  }

  const token = authHeader.split(" ")[1];
  const decoded = verifyToken(token);

  if (!decoded || typeof decoded === "string") {
    return { status: 401, body: { message: "Invalid or expired token" } };
  }

  (req as any).userId = (decoded as any).userId;
//   console.log("Decoded token:11", decoded);
  req.userId = decoded.userId;
//   console.log("Decoded token:", decoded);
  return null;
}
