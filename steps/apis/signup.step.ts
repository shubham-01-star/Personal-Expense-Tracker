import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../../src/bootstrap";
import { User } from "../../src/models/User";
import { generateOTP } from "../../src/utils/otp.util"
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const config: ApiRouteConfig = {
    type: "api",
    name: "signup",
    description: "Register a new user",
    method: "POST",
    flows: ['expense-tracker'],
    path: "/signup",

    bodySchema: z.object({
        name: z.string(),
        email: z.string().email(),
        password: z.string().min(6, "Password must be at least 6 characters"),
        monthly_budget: z.number().optional(),
    }),

    responseSchema: {
        200: z.object({
            user: z.object({
                id: z.number(),
                name: z.string(),
                email: z.string(),
            }),
        }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string(), error: z.string() }),
    },

    emits: ["user.signedup", "send_otp"],
};

export const handler: Handlers["signup"] = async (req, { logger, emit }) => {
    const { name, email, password, monthly_budget } = req.body;

    logger.info("Signup request received", { email });

    if (!name || !email || !password) {
        return { status: 400, body: { message: "All fields are required" } };
    }

    try {
        await dbInit.initialize();
        const userRepo = dbInit.getRepository(User);

        // Check if user already exists
        const existingUser = await userRepo.findOne({ where: { email } });
        if (existingUser) {
            return { status: 400, body: { message: "Email already registered" } };
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOTP(6);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);


        // Create new user
        const newUser = userRepo.create({
            name,
            otp,
            otpExpiresAt : otpExpiry,
            email,
            password: hashedPassword,
            monthly_budget: monthly_budget ?? 0,
        });

        const savedUser = await userRepo.save(newUser);

        // Generate JWT token
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            logger.error("JWT_SECRET is not defined in .env");
            return { status: 500, body: { message: "Server misconfiguration", error: "Missing JWT secret" } };
        }

        const token = jwt.sign(
            { userId: savedUser.id, email: savedUser.email },
            secret,
            { expiresIn: "1d" }
        );

        emit?.({
            topic: "send_otp",
            data: {
                templateId: "Otp-send",
                email: savedUser.email,
                templateData: { name: savedUser.name, otp:savedUser.otp },
            },
        });
        console.log("Emitted welcome email notification");



        return {
            status: 200,
            body: {
                message: "OTP Sended Successfully",
                user: {
                    id: savedUser.id,
                    name: savedUser.name,
                    email: savedUser.email,
                },
            },
        };
    } catch (err: any) {
        logger.error("Signup error", { error: err.message });
        return { status: 500, body: { message: "Internal server error", error: err.message } };
    }
};
