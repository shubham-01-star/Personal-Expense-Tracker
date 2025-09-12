import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../../src/bootstrap";
import { Expense } from "../../src/models/Expense";
import { ExpenseCategory } from "../../src/enum/ExpenseCategory";
import { Between, MoreThanOrEqual, LessThanOrEqual } from "typeorm";


export const config: ApiRouteConfig = {
    type: "api",
    name: "expense-history",
    description: "Get expense history with filters",
    method: "GET",
    path: "/expenses_history",

    queryParams: [
        { name: "userId", description: "ID of the user whose expenses you want" },
        { name: "category", description: "Filter by category (optional)" },
        { name: "startDate", description: "Filter by start date (optional)" },
        { name: "endDate", description: "Filter by end date (optional)" },
    ],

    responseSchema: {
        200: z.object({
            expenses: z.array(
                z.object({
                    id: z.number(),
                    date: z.string(),
                    category: z.nativeEnum(ExpenseCategory),
                    description: z.string().nullable(),
                    amount: z.number(),
                })
            ),
        }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string(), error: z.string() }),
    },
    emits: [],
};

export const handler: Handlers["expense-history"] = async (req, { logger }) => {
    console.log("Request query params:", req.queryParams);
    const userId = Number(req.queryParams.userId);
    const category = req.queryParams.category as ExpenseCategory | undefined;
    const { startDate, endDate } = req.queryParams;

    const start = startDate ? new Date(Array.isArray(startDate) ? startDate[0] : startDate) : undefined;
    const end = endDate ? new Date(Array.isArray(endDate) ? endDate[0] : endDate) : undefined;



    if (!userId) {
        return { status: 400, body: { message: "userId is required" } };
    }

    await dbInit.initialize();

    try {
        const expenseRepo = dbInit.getRepository(Expense);

        const where: any = { userId };

        if (category) {
            where.category = category;
        }
        if (start && end) {
            where.date = Between(start, end);
        } else if (start) {
            where.date = MoreThanOrEqual(start);
        } else if (end) {
            where.date = LessThanOrEqual(end);
        }
        
        const expenses = await expenseRepo.find({
            where,
            order: { date: "DESC" },
        });

        return {
            status: 200,
            body: {
                expenses: expenses.map((e) => ({
                    id: e.id,
                    date: e.date.toString().split("T")[0],
                    category: e.category,
                    description: e.description ?? null,
                    amount: Number(e.amount),
                })),
            },
        };
    } catch (err: any) {
        logger.error("Expense history fetch error", { error: err.message });
        return {
            status: 500,
            body: { message: "Internal server error", error: err.message },
        };
    }
};
