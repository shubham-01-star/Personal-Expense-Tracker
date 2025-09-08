import { ApiRouteConfig, Handlers } from "motia";
import { date, z } from "zod";
import { dbInit } from "../src/bootstrap";
import { Expense } from "../src/models/Expense";
import { User } from "../src/models/User";
import { ExpenseCategory } from "../src/enum/ExpenseCategory";
import { RecurringExpense } from "../src/models/recurring_expense";
import { CategoryBudget } from "../src/models/CategoryBudget_model"

export const config: ApiRouteConfig = {
  type: "api",
  name: "expense-add",
  description: "Add a new expense for a user",
  method: "POST",
  path: "/expense-add",

  bodySchema: z.object({
    userId: z.number(),
    amount: z.number(),
    category: z.string(),
    description: z.string().optional(),
    date: z.string().optional(),
  }),

  responseSchema: {
    200: z.object({
      id: z.number(),
      amount: z.number(),
      category: z.string(),
      description: z.string().optional(),
      date: z.string(),
    }),
    400: z.object({ message: z.string() }),
    500: z.object({ message: z.string(), error: z.string() }),
  },
  emits: [],
};

export const handler: Handlers["expense-add"] = async (req, { logger }) => {
  const { userId, amount, category, description, date } = req.body;
  // Initialize the database connection
  await dbInit.initialize();

  try {
    const userRepo = dbInit.getRepository(User);
    const expenseRepo = dbInit.getRepository(Expense);

    // Check if user exists
    const user = await userRepo.findOneBy({ id: userId });
    if (!user) {
      return { status: 400, body: { message: "User not found" } };
    }

    // Create expense
    const expense = new Expense();
    expense.user = user;
    expense.amount = amount;
    expense.category = category as ExpenseCategory;
    expense.description = description || "";
    expense.date = date || "";

    const savedExpense = await expenseRepo.save(expense);

    logger.info("Expense added", { expenseId: savedExpense.id, userId });

    const categoryRepo = dbInit.getRepository(CategoryBudget);
    let catBudget = await categoryRepo.findOne({
      where: { userId: user.id, name: category as ExpenseCategory },
    });
    if (catBudget) {
      catBudget.spent += amount;
      await categoryRepo.save(catBudget);
    } else {
      // Create if not exists
      catBudget = categoryRepo.create({ user, name: category as ExpenseCategory, limit: user.monthly_budget, spent: amount });
      await categoryRepo.save(catBudget);
    }

    return {
      status: 200,
      body: {
        id: savedExpense.id,
        amount: savedExpense.amount,
        category: savedExpense.category,
        description: savedExpense.description,
        date: expense.date.toString(),
      },
    };
  } catch (err: any) {
    logger.error("Expense add error", { error: err.message });
    return { status: 500, body: { message: "Internal server error", error: err.message } };
  }
};
