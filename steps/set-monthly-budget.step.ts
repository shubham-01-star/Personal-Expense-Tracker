import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../src/bootstrap";
import { User } from "../src/models/User";
import { CategoryBudget } from "../src/models/CategoryBudget_model";
import { ExpenseCategory } from "../src/enum/ExpenseCategory";

export const config: ApiRouteConfig = {
    type: "api",
    name: "monthly-budget-update",
    description: "Update user's monthly budget and create missing category limits",
    method: "POST",
    path: "/budget/update",

    bodySchema: z.object({
        userId: z.number(),
        amount: z.number().min(0),
        action: z.enum(["POST", "GET"]).default("POST"),
    }),

    responseSchema: {
        200: z.object({
            message: z.string(),
            overallBudget: z.object({
                amount: z.number(),
            }),
        }),
        400: z.object({ message: z.string() }),
        500: z.object({ message: z.string(), error: z.string() }),
    },
    emits: [],
};

// export const handler: Handlers["monthly-budget-update"] = async (req, { logger }) => {
//     const { userId, amount } = req.body;

//     await dbInit.initialize();
//     const userRepo = dbInit.getRepository(User);
//     const categoryRepo = dbInit.getRepository(CategoryBudget);

//     try {
//         const user = await userRepo.findOneBy({ id: userId });
//         if (!user) return { status: 400, body: { message: "User not found" } };

//         user.monthly_budget = amount;
//         await userRepo.save(user);

//         const existingCategories = await categoryRepo.find({
//             where: { userId },
//         });
//         const existingCategoryNames = existingCategories.map((cat) => cat.name as ExpenseCategory);

//         // ensure the returned array has the string-literal union type the handler expects
//         type ExpenseCategoryLiteral = "food" | "travel" | "transport" | "entertainment" | "shopping" | "bills" | "other";
//         const categoriesCreated: ExpenseCategoryLiteral[] = [];

//         for (const cat of Object.values(ExpenseCategory)) {
//             const catEnum = cat as ExpenseCategory;
//             if (!existingCategoryNames.includes(catEnum)) {
//                 const newCatBudget = categoryRepo.create({
//                     user,
//                     name: catEnum,
//                     limit: amount,
//                     spent: 0,
//                 });
//                 await categoryRepo.save(newCatBudget);
//                 categoriesCreated.push(catEnum as unknown as ExpenseCategoryLiteral);
//             }
//         }

//         return {
//             status: 200,
//             body: {
//                 message: "Monthly budget updated and missing category limits created",
//                 overallBudget: { amount: user.monthly_budget },
//                 categoriesCreated,
//             },
//         };
//     } catch (err: any) {
//         logger.error("Monthly budget update error", { error: err?.message });
//         return { status: 500, body: { message: "Internal server error", error: err?.message ?? String(err) } };
//     }
// };


export const handler: Handlers["monthly-budget-update"] = async (req, { logger }) => {
    await dbInit.initialize();
    const userRepo = dbInit.getRepository(User);
    const categoryRepo = dbInit.getRepository(CategoryBudget);
    const { action } = req.body;


    try {
        if (action === "POST") {
            const { userId, amount } = req.body;

            const user = await userRepo.findOneBy({ id: userId });
            if (!user) return { status: 400, body: { message: "User not found" } };

            user.monthly_budget = amount;
            await userRepo.save(user);

            const existingCategories = await categoryRepo.find({ where: { userId } });
            const existingCategoryNames = existingCategories.map((cat) => cat.name as ExpenseCategory);

            type ExpenseCategoryLiteral = "food" | "travel" | "transport" | "entertainment" | "shopping" | "bills" | "other";
            const categoriesCreated: ExpenseCategoryLiteral[] = [];

            for (const cat of Object.values(ExpenseCategory)) {
                const catEnum = cat as ExpenseCategory;
                if (!existingCategoryNames.includes(catEnum)) {
                    const newCatBudget = categoryRepo.create({
                        user,
                        name: catEnum,
                        limit: amount,
                        spent: 0,
                    });
                    await categoryRepo.save(newCatBudget);
                    categoriesCreated.push(catEnum as unknown as ExpenseCategoryLiteral);
                }
            }

            return {
                status: 200,
                body: {
                    message: "Monthly budget updated and missing category limits created",
                    overallBudget: { amount: user.monthly_budget },
                    categoriesCreated,
                },
            };
        }

        // -------- GET CASE --------
        if (action === "GET") {
            const { userId } = req.body;
            const user = await userRepo.findOneBy({ id: userId });
            if (!user) return { status: 400, body: { message: "User not found" } };

            const categories = await categoryRepo.find({ where: { userId } });

            const totalSpending = categories.reduce((sum, cat) => sum + cat.spent, 0);
            logger.info("Total spending across categories", { userId, totalSpending }); 
            const remainingBudget = (user.monthly_budget ?? 0) - totalSpending;
            logger.info("Remaining budget calculated", { userId, remainingBudget });


            return {
                status: 200,
                body: {
                    message: "User budget fetched successfully",
                    overallBudget: { amount: user.monthly_budget ?? 0,
                        totalSpending,
                        remainingBudget
                     },
                    categories, 
                },
                
            };
        }

        return { status: 400, body: { message: "Invalid method" } };
    } catch (err: any) {
        logger.error("Monthly budget handler error", { error: err.message });
        return { status: 500, body: { message: "Internal server error", error: err.message } };
    }
};
