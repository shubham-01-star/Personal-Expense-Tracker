import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../src/bootstrap";
import { User } from "../src/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const config: ApiRouteConfig = {
    type: "api",
    name: "login",
    description: "Authenticate a user and get a JWT token",
    method: "POST",
    path: "/login",

    bodySchema: z.object({
        email: z.string().email(),
        password: z.string(),
    }),

    responseSchema: {
        200: z.object({
            token: z.string(),
            user: z.object({
                id: z.number(),
                name: z.string(),
                email: z.string(),
            }),
        }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string(), error: z.string() }),
    },

    emits: [],
};

export const handler: Handlers["login"] = async (req, { logger }) => {
    const { email, password } = req.body;

    logger.info("Login request received", { email });

    if (!email || !password) {
        return { status: 400, body: { message: "Email and password are required" } };
    }

    await dbInit.initialize();

    try {
        const userRepo = dbInit.getRepository(User);
        const user = await userRepo.findOne({ where: { email } });

        if (!user) {
            return { status: 400, body: { message: "Invalid email" } };
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return { status: 400, body: { message: "Invalid password" } };
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            logger.error("JWT_SECRET is not defined in .env");
            return { status: 500, body: { message: "Server misconfiguration", error: "Missing JWT secret" } };
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            secret,
            { expiresIn: "1d" } 
        );

        return {
            status: 200,
            body: {
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                },
            },
        };
    } catch (err: any) {
        logger.error("Login error", { error: err.message });
        return { status: 500, body: { message: "Internal server error", error: err.message } };
    }
};
