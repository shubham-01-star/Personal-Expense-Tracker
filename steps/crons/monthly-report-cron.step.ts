import { CronConfig, CronHandler } from "motia";
import { dbInit } from "../../src/bootstrap";
import { User } from "../../src/models/User";
import { Expense } from "../../src/models/Expense";
import { CategoryBudget } from "../../src/models/CategoryBudget_model";
import { RecurringExpense } from "../../src/models/recurring_expense";
import { RecurringStatus } from "../../src/enum/Recurring_enum";
import { Between } from "typeorm";
import { createReportPDF, sendMonthlyReport } from "../../src/utils/monthlyReportMailer-util";

export const config: CronConfig = {
  type: "cron",
   cron: "*/2 * * * *",
//   cron: "0 9 1 * *", // every 1st day of the month at 9 AM
  name: "MonthlyExpenseReportJob",
  description: "Generate monthly expense reports and send via email",
  emits: [],
  flows: ["expense-tracker"],
};

export const handler: CronHandler = async ({ logger }) => {
  await dbInit.initialize();
  const userRepo = dbInit.getRepository(User);
  const expenseRepo = dbInit.getRepository(Expense);
  const budgetRepo = dbInit.getRepository(CategoryBudget);
  const recurringRepo = dbInit.getRepository(RecurringExpense);

  // only verified users
  const users = await userRepo.find({ where: { isVerified: true } });

  // last month ka start aur end date
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

  for (const user of users) {
    try {
      // ✅ fetch user expenses of last month
      const expenses = await expenseRepo.find({
        where: {
          userId: user.id,
        //   createdAt: Between(startDate, endDate),
        },
      });

      if (!expenses.length) {
        logger.info("No data for user", { userId: user.id });
        continue;
      }

      // ✅ fetch budgets
      const budgets = await budgetRepo.find({ where: { userId: user.id } });
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

      // ✅ recurring expenses
      const recurringExpenses = await recurringRepo
        .createQueryBuilder("recurring")
        .where("recurring.userId = :userId", { userId: user.id })
        .andWhere("recurring.status = :status", { status: RecurringStatus.ACTIVE })
        .andWhere("recurring.startDate <= :end", { end: endDate })
        .andWhere("(recurring.endDate IS NULL OR recurring.endDate >= :start)", { start: startDate })
        .getMany();

      const recurringFormatted = recurringExpenses.map((r) => ({
        category: "Bills",
        description: r.title,
        amount: Number(r.amount),
        frequency: r.frequency,
        status: r.status,
      }));

      // ✅ final report data
      const reportData = {
        summary: {
          generatedOn: new Date().toISOString().split("T")[0],
          totalExpenses,
          budget: totalBudget,
          remaining,
        },
        categoryBreakdown,
        transactions,
        recurringExpenses: recurringFormatted,
      };
      console.log("report....",reportData)

      // ---- PDF generate & email send ----
      const pdfBuffer = await createReportPDF(reportData, user.name);
      await sendMonthlyReport(user.email, pdfBuffer, user.name);

      logger.info("Monthly report sent", { userId: user.id });
    } catch (err: any) {
      logger.error("Error generating monthly report", { userId: user.id, error: err.message });
    }
  }
};
