import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../src/bootstrap";
import { User } from "../src/models/User";
import { CategoryBudget } from "../src/models/CategoryBudget_model";
import { ExpenseCategory } from "../src/enum/ExpenseCategory";

export const config: ApiRouteConfig = {
  type: "api",
  name: "category-budget-update",
  description: "Update limit for a specific category",
  method: "POST",
  path: "/budget/category",

  bodySchema: z.object({
    userId: z.number(),
    category: z.nativeEnum(ExpenseCategory),
    limit: z.number().min(0),
  }),

  responseSchema: {
    200: z.object({
      message: z.string(),
      category: z.object({
        name: z.nativeEnum(ExpenseCategory),
        limit: z.number(),
        spent: z.number(),
      }),
    }),
    400: z.object({ message: z.string() }),
    500: z.object({ message: z.string(), error: z.string() }),
  },
  emits: [],
};

export const handler: Handlers["budget-category-update"] = async (req, { logger }) => {
  const { userId, category, limit } = req.body;

  await dbInit.initialize();
  const userRepo = dbInit.getRepository(User);
  const categoryRepo = dbInit.getRepository(CategoryBudget);

  try {
    const user = await userRepo.findOneBy({ id: userId });
    if (!user) return { status: 400, body: { message: "User not found" } };

    let catBudget = await categoryRepo.findOne({
      where: { userId: user.id, name: category },
    });

    if (!catBudget) {
      // Create if not exists
      catBudget = categoryRepo.create({ user, name: category, limit, spent: 0 });
    } else {
      catBudget.limit = limit;
    }

    const savedCat = await categoryRepo.save(catBudget);

    return {
      status: 200,
      body: {
        message: "Category budget updated successfully",
        category: { name: savedCat.name, limit: savedCat.limit, spent: savedCat.spent },
      },
    };
  } catch (err: any) {
    logger.error("Category budget update error", { error: err.message });
    return { status: 500, body: { message: "Internal server error", error: err.message } };
  }
};
