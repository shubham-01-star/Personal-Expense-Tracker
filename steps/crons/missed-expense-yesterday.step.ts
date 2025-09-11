import { CronConfig, Handlers, CronHandler } from 'motia';
import { dbInit } from '../../src/bootstrap';
import { User } from '../../src/models/User';
import { Expense } from '../../src/models/Expense';

export const config: CronConfig = {
    type: 'cron',
    cron: '0 9 * * *', // every day at 9 AM
    name: 'DailyMorningReminderJob',
    description: 'Sends reminder if user missed yesterday’s expense',
    emits: ['sendMorningReminder'],
    flows: ['expense-tracker'],
};


export const handler: CronHandler<{
    topic: 'SendOtp';
    data: { templateId: string; email: string; templateData: Record<string, any> };
}> = async ({ logger, emit }) => {
    console.log("start cron")
    await dbInit.initialize();
    const userRepo = dbInit.getRepository(User);
    const expenseRepo = dbInit.getRepository(Expense);

    const users = await userRepo.find({
        where: {
            isVerified: true
        }
    });
    console.log("user data::", users)

    // Get yesterday’s date (YYYY-MM-DD)
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];

    for (const user of users) {
        const expensesYesterday = await expenseRepo
            .createQueryBuilder('expense')
            .where('expense.userId = :userId', { userId: user.id })
            .andWhere('DATE(expense.createdAt) = :yesterday', { yesterday })
            .getMany();
        console.log("check add or not (yesterday)", expensesYesterday);
        if (expensesYesterday.length === 0) {
            logger.info('No expense added today, sending reminder', { userId: user.id });

            // Emit event handler
            (emit as any)?.({
                topic: "sendMorningReminder",
                data: {
                    templateId: "daily-expense-morning-reminder",
                    email: user.email,
                    templateData: { name: user.name, date: yesterday },
                },
            });
            console.log("sent reminder for", user.email);
        }
    }
};
