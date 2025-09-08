import { ApiRouteConfig, Handlers } from "motia";
import { z } from "zod";
import { dbInit } from "../src/bootstrap";
import { RecurringExpense } from "../src/models/recurring_expense";
import { RecurringAction, RecurringFrequency, RecurringStatus } from "../src/enum/Recurring_enum";

export const config: ApiRouteConfig = {
    type: "api",
    name: "recurring-expense",
    description: "Manage recurring expenses with a single POST API",
    method: "POST",
    path: "/recurring_expense",

    bodySchema: z.object({
        action: z.nativeEnum(RecurringAction),
        userId: z.number(),
        id: z.number().optional(),
        title: z.string().optional(),
        amount: z.number().optional(),
        frequency: z.nativeEnum(RecurringFrequency).optional(),
        startDate: z.string().optional(),
        endDate: z.string().nullable().optional(),
        status: z.nativeEnum(RecurringStatus).optional(),
    }),

    responseSchema: {
        200: z.object({ message: z.string(), data: z.any().optional() }),
        400: z.object({ message: z.string() }),
        404: z.object({ message: z.string() }),
        500: z.object({ message: z.string(), error: z.string() }),
    },
    emits: [],
};

export const handler: Handlers["recurring-expense"] = async (req, { logger }) => {
    // console.log("Request body:", req.body);
    const { action, userId, id, title, amount, frequency, startDate, endDate, status } = req.body;

    await dbInit.initialize();
    const repo = dbInit.getRepository(RecurringExpense);
    // logger.info("Recurring expense action", { action, userId, id });

    if (!action || !userId) {
        return { status: 400, body: { message: "action and userId are required" } };
    }

    try {
        // console.log("Action received:", action);
        switch (action.toLowerCase()) {
            case RecurringAction.ADD:
                console.log("Action:", action);
                const newRecurring = repo.create({
                    userId: userId,
                    title,
                    amount,
                    frequency: frequency as RecurringFrequency,
                    startDate: startDate ? new Date(startDate as string) : new Date(),
                    endDate: endDate ? new Date(endDate as string) : null,
                    status: (status as RecurringStatus) || RecurringStatus.ACTIVE,
                });
                const savedExpense = await repo.save(newRecurring);

                // console.log("New recurring expense added:", savedExpense);

                return { status: 200, body: { message: "Recurring expense added", data: newRecurring } };

            case RecurringAction.UPDATE: {
                if (!id) {
                    return { status: 400, body: { message: "id is required for update" } };
                }

                const frequencyValue =
                    frequency && Object.values(RecurringFrequency).includes(frequency as RecurringFrequency)
                        ? (frequency as RecurringFrequency)
                        : undefined;

                const statusValue =
                    status && Object.values(RecurringStatus).includes(status as RecurringStatus)
                        ? (status as RecurringStatus)
                        : undefined;

                const updateData: Partial<RecurringExpense> = {};

                if (title !== undefined) updateData.title = title;
                if (amount !== undefined) updateData.amount = amount;
                if (frequencyValue !== undefined) updateData.frequency = frequencyValue;
                if (startDate !== undefined) updateData.startDate = new Date(startDate);
                if (endDate !== undefined) updateData.endDate = new Date(endDate as string);
                if (statusValue !== undefined) updateData.status = statusValue;

                await repo.update({ id, userId }, updateData);

                return {
                    status: 200,
                    body: { message: "Recurring expense updated" },
                };
            }


            case RecurringAction.DELETE: {
                if (!id) {
                    return { status: 400, body: { message: "id is required for delete" } };
                }

                const existingExpense = await repo.findOne({ where: { id, user: { id: userId } } });
                if (!existingExpense) {
                    return { status: 404, body: { message: "Recurring expense not found" } };
                }

                // Delete 
                await repo.remove(existingExpense);

                return { status: 200, body: { message: "Recurring expense deleted" } };
            }


            case RecurringAction.LIST: {
                // User ke expenses fetch karo
                const list: RecurringExpense[] = await repo.find({
                    where: { user: { id: userId } },
                    order: { startDate: "DESC" },
                });

                if (!list || list.length === 0) {
                    return { status: 200, body: { message: "No recurring expenses found", data: [] } };
                }

                return { status: 200, body: { message: "Recurring expenses fetched", data: list } };
            }


            default:
                return { status: 400, body: { message: "Invalid action" } };
        }
    } catch (err: any) {
        logger.error("Recurring expense error", { error: err.message });
        return { status: 500, body: { message: "Internal server error", error: err.message } };
    }
};
