import crypto from "crypto";

export function generateOTP(length: number = 6): string {
  // numeric OTP (default: 6 digits)
  const otp = crypto.randomInt(
    Math.pow(10, length - 1),
    Math.pow(10, length)
  ).toString();
  return otp;
}
