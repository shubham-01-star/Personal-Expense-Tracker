import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../../src/bootstrap";
import { Expense } from "../../src/models/Expense";
import { CategoryBudget } from "../../src/models/CategoryBudget_model";
import { RecurringExpense } from "../../src/models/recurring_expense";
import { User } from "../../src/models/User";
import { Between } from "typeorm";
import { requireAuth } from "../../src/middleware/requireAuth";


export const config: ApiRouteConfig = {
    type: "api",
    name: "reports-export",
    description: "Export reports data (JSON only)",
    method: "GET",
    path: "/reports/export",
    responseSchema: {
        200: z.object({
            summary: z.object({
                generatedOn: z.string(),
                totalExpenses: z.number(),
                budget: z.number(),
                remaining: z.number(),
            }),
            categoryBreakdown: z.array(
                z.object({
                    category: z.string(),
                    spent: z.number(),
                    budget: z.number(),
                    usage: z.string(),
                })
            ),
            transactions: z.array(
                z.object({
                    date: z.string(),
                    category: z.string(),
                    description: z.string(),
                    amount: z.number(),
                })
            ),
            recurringExpenses: z.array(
                z.object({
                    category: z.string(),
                    description: z.string(),
                    amount: z.number(),
                    frequency: z.string(),
                    status: z.string(),
                })
            ),
        }),
        400: z.object({ error: z.string() }),
        401: z.object({ error: z.string() }),
        500: z.object({ error: z.string() }),
    },
    emits: [],
};

export const handler: Handlers["reports-export"] = async (req, { logger }) => {

    const authError = requireAuth(req);
    if (authError) {
        const status = (authError as any).status ?? 401;
        const body = (authError as any).body ?? {};
        const message = (body && (body.error ?? body.message)) ?? "Unauthorized";
        return { status, body: { error: String(message) } } as any;
    }
    console.log("Auth passed" , authError);

    const startDateRaw = req.queryParams.startDate;
    const endDateRaw = req.queryParams.endDate;
    const userIdRaw = req.queryParams.userId; // ✅ User-specific report

    const startDate = Array.isArray(startDateRaw) ? startDateRaw[0] : startDateRaw;
    const endDate = Array.isArray(endDateRaw) ? endDateRaw[0] : endDateRaw;
    const userId = Array.isArray(userIdRaw) ? Number(userIdRaw[0]) : Number(userIdRaw);

    if (!startDate || !endDate || !userId) {
        return { status: 400, body: { error: "startDate, endDate and userId are required" } };
    }

    await dbInit.initialize();
    const expenseRepo = dbInit.getRepository(Expense);
    const budgetRepo = dbInit.getRepository(CategoryBudget);
    const recurringRepo = dbInit.getRepository(RecurringExpense);
    const userRepo = dbInit.getRepository(User);

    try {
        // ✅ get user
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            return { status: 400, body: { error: "User not found" } };
        }

        // ✅ fetch expenses
        const expenses = await expenseRepo.find({
            where: {
                userId,
                createdAt: Between(new Date(startDate), new Date(endDate)),
            },
        });

        // ✅ fetch budgets
        const budgets = await budgetRepo.find({ where: { userId } });
        const totalBudget = user.monthly_budget ?? budgets.reduce((sum, b) => sum + b.limit, 0);

        // summary
        const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
        const remaining = totalBudget - totalExpenses;

        // category breakdown
        const categoryBreakdown = budgets.map((b) => {
            const spent = expenses
                .filter((e) => e.category === b.name)
                .reduce((sum, e) => sum + Number(e.amount), 0);

            return {
                category: b.name,
                spent,
                budget: b.limit,
                usage: b.limit ? ((spent / b.limit) * 100).toFixed(1) + "%" : "0.0%",
            };
        });

        // transactions
        const transactions = expenses.map((e) => ({
            date: e.createdAt.toISOString().split("T")[0],
            category: e.category,
            description: e.description || "",
            amount: Number(e.amount),
        }));

        // ✅ recurring expenses from DB
        const recurringExpenses = await recurringRepo.find({ where: { userId } });
        const recurringFormatted = recurringExpenses.map((r) => ({
            category: "Bills", // tumhe agar mapping karna hai to ExpenseCategory se link bana sakte ho
            description: r.title,
            amount: Number(r.amount),
            frequency: r.frequency,
            status: r.status,
        }));

        return {
            status: 200,
            body: {
                summary: {
                    generatedOn: new Date().toISOString().split("T")[0],
                    totalExpenses,
                    budget: totalBudget,
                    remaining,
                },
                categoryBreakdown,
                transactions,
                recurringExpenses: recurringFormatted,
            },
        };
    } catch (err: any) {
        logger.error("Reports export error", { error: err.message });
        return { status: 500, body: { error: "Unable to fetch report, please try later" } };
    }
};
