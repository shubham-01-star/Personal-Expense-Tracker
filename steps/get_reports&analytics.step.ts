import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../src/bootstrap";
import { Expense } from "../src/models/Expense";
import { RecurringExpense } from "../src/models/recurring_expense";
import { RecurringStatus } from "../src/enum/Recurring_enum";
import { Between } from "typeorm";

export const config: ApiRouteConfig = {
    type: "api",
    name: "reports-analytics",
    description: "Generate spending reports & analytics",
    method: "GET",
    path: "/reports",
    responseSchema: {
        200: z.object({
            spendingByCategory: z.array(z.object({ category: z.string(), amount: z.number() })),
            dailySpendingTrend: z.array(z.object({ date: z.string(), amount: z.number() })),
            insights: z.object({
                highestExpense: z.number(),
                averageDaily: z.number(),
                totalTransactions: z.number(),
                recurringTotal: z.number(),
            }),
        }),
        400: z.object({ error: z.string() }),
        404: z.object({ error: z.string() }),
        500: z.object({ error: z.string() }),
    },
    emits: [],
};

export const handler: Handlers["reports-analytics"] = async (req, { logger }) => {
    const startDateRaw = req.queryParams.startDate;
    const endDateRaw = req.queryParams.endDate;

    const startDate = Array.isArray(startDateRaw) ? startDateRaw[0] : startDateRaw;
    const endDate = Array.isArray(endDateRaw) ? endDateRaw[0] : endDateRaw;

    if (!startDate || !endDate) {
        return { status: 400, body: { error: "Invalid date range" } };
    }

    await dbInit.initialize();
    const expenseRepo = dbInit.getRepository(Expense);
    const recurringRepo = dbInit.getRepository(RecurringExpense);

    try {
        const expenses = await expenseRepo.find({
            where: { createdAt: Between(new Date(startDate), new Date(endDate)) },
        });

        if (!expenses.length) {
            return { status: 404, body: { error: "No report data found for the given period" } };
        }

        const categoryTotals: Record<string, number> = {};
        expenses.forEach(e => {
            categoryTotals[e.category] = (categoryTotals[e.category] || 0) + Number(e.amount);
        });
        const spendingByCategory = Object.entries(categoryTotals).map(([category, amount]) => ({ category, amount }));

        const dailyTotals: Record<string, number> = {};
        expenses.forEach(e => {
            const date = e.createdAt.toISOString().split("T")[0];
            dailyTotals[date] = (dailyTotals[date] || 0) + Number(e.amount);
        });
        const dailySpendingTrend = Object.entries(dailyTotals).map(([date, amount]) => ({ date, amount }));

        const highestExpense = Math.max(...expenses.map(e => Number(e.amount)));
        const totalDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1;
        const averageDaily = Math.round(expenses.reduce((acc, e) => acc + Number(e.amount), 0) / totalDays);
        const totalTransactions = expenses.length;

        const recurringExpenses = await recurringRepo
            .createQueryBuilder("recurring")
            .where("recurring.status = :status", { status: RecurringStatus.ACTIVE })
            .andWhere("recurring.startDate <= :end")
            .andWhere("(recurring.endDate IS NULL OR recurring.endDate >= :start)")
            .setParameters({
                start: new Date(startDate),
                end: new Date(endDate),
            })
            .getMany();

        const recurringTotal = recurringExpenses.reduce((acc, e) => acc + Number(e.amount), 0);

        return {
            status: 200,
            body: { spendingByCategory, dailySpendingTrend, insights: { highestExpense, averageDaily, totalTransactions, recurringTotal } },
        };
    } catch (err: any) {
        logger.error("Reports analytics error", { error: err.message });
        return { status: 500, body: { error: "Unable to generate report, please try later" } };
    }
};
