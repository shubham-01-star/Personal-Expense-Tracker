import { collectFlows, ApiRouteConfig, EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import { User } from "../src/models/User";
import * as dotenv from 'dotenv'
import { dbInit } from "../src/bootstrap";
import nodemailer from 'nodemailer'
dotenv.config()


export const config: ApiRouteConfig = {
  type: "api",
  name: "verifyOtp",
  method: "POST",
  path: "/verify-otp",
  flows: ['expense-tracker'],
  bodySchema: z.object({
    email: z.string().email(),
    otp: z.string(),
  }),
  emits: ["user.signedup", "notification"],
};

export const handler: Handlers["verifyOtp"] = async (req, { logger, emit }) => {
  console.log("ooortr")
  const { email, otp } = req.body;
  await dbInit.initialize();
  const userRepo = dbInit.getRepository(User);

  const user = await userRepo.findOne({ where: { email } });
  if (!user) {
    return { status: 400, body: { message: "User not found" } };
  }

  if (user.otp !== otp) {
    return { status: 400, body: { message: "Invalid OTP" } };
  }

  user.isVerified = true;
  user.otp = null;
  await userRepo.save(user);

  // Emit Welcome Mail
  (emit as any)?.({
    topic: "notification",
    data: {
      templateId: "welcome-email",
      email: user.email,
      templateData: { name: user.name },
    },
  });
  console.log("end er")

  return { status: 200, body: { message: "User verified successfully" } };
};
