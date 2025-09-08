import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../src/bootstrap";
import { Expense } from "../src/models/Expense";
import { Between } from "typeorm";
import { User } from "../src/models/User";
import { RecurringExpense } from "../src/models/recurring_expense";
import { RecurringStatus } from "../src/enum/Recurring_enum";


export const config: ApiRouteConfig = {
    type: "api",
    name: "expense-get",
    description: "Fetch all expenses for a user (category totals + recent list)",
    method: "GET",
    path: "/expenses",

    queryParams: [
        { name: "userId", description: "ID of the user whose expenses you want" },
    ],

    responseSchema: {
        200: z.object({
            totals: z.record(z.string(), z.number()), // category -> total amount
            recentExpenses: z.array(
                z.object({
                    id: z.number(),
                    amount: z.number(),
                    category: z.string(),
                    description: z.string().nullable(),
                    createdAt: z.string(),
                })
            ),
        }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string(), error: z.string() }),
    },
    emits: [],
};

export const handler: Handlers["expense-get"] = async (req, { logger }) => {
    const userId = Number(req.queryParams.userId);
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await dbInit.initialize();
    logger.info("Fetching expenses for user", { userId });

    if (!userId) {
        return { status: 400, body: { message: "userId is required" } };
    }

    try {
        const expenseRepo = dbInit.getRepository(Expense)
        const recurringExpenseRepo = dbInit.getRepository(RecurringExpense);

        // fetch all expenses for aggregation
        const expenses = await expenseRepo.find({
            where: { userId },
            order: { createdAt: "DESC" },
        });

        const totalSpentThisMonth = await expenseRepo
            .createQueryBuilder("expense")
            .select("SUM(expense.amount)", "total")
            .where("expense.userId = :userId", { userId })
            .andWhere("expense.createdAt BETWEEN :start AND :end", {
                start: startOfMonth,
                end: endOfMonth,
            })
            .getRawOne();

        // category totals
        const categoriesByTotals: Record<string, number> = {};
        for (const e of expenses) {
            if (!categoriesByTotals[e.category]) categoriesByTotals[e.category] = 0;
            categoriesByTotals[e.category] += Number(e.amount);
        }

        // recent expenses (limit 5)
        const recentExpenses = expenses.map((e) => ({
            id: e.id,
            amount: Number(e.amount),
            category: e.category,
            description: e.description ?? null,
            createdAt: e.createdAt.toISOString(),
        }));

        const recurringMonthly = await recurringExpenseRepo
            .createQueryBuilder("recurring")
            .select("SUM(recurring.amount)", "total")
            .where("recurring.userId = :userId", { userId })
            .andWhere("recurring.frequency = :freq", { freq: "monthly" })
            .andWhere("recurring.status = :status", { status: RecurringStatus.ACTIVE })
            .getRawOne();

        const recurringExpenses = await recurringExpenseRepo.find({
            where: { userId, status: RecurringStatus.ACTIVE },
            order: { id: "DESC" },
        });

        const BudgetRemaining = async () => {
            const userRepo = dbInit.getRepository(User);
            const user = await userRepo.findOneBy({ id: userId });
            if (!user) return 0;

            const monthlyBudget = user.monthly_budget || 0;
            const spent = totalSpentThisMonth.total ? Number(totalSpentThisMonth.total) : 0;
            const recurring = recurringMonthly.total ? Number(recurringMonthly.total) : 0;

            return monthlyBudget - spent - recurring;
        };

        return {
            status: 200,
            body: {
                totals: {
                    totalSpentThisMonth: Number(totalSpentThisMonth.total ?? 0),
                    recurringMonthly: Number(recurringMonthly.total ?? 0),
                    budgetRemaining: await BudgetRemaining(),
                    ...categoriesByTotals,
                },
                recentExpenses,
                recurringExpenses
            },
        };

    } catch (err: any) {
        logger.error("Get expenses error", { error: err.message });
        return {
            status: 500,
            body: { message: "Internal server error", error: err.message },
        };
    }
};
