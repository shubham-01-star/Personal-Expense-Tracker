import { CronConfig, Handlers, CronHandler } from 'motia';
import { dbInit } from '../../src/bootstrap';
import { User } from '../../src/models/User';
import { Expense } from '../../src/models/Expense';

export const config: CronConfig = {
  type: 'cron',
  cron: '0 21 * * *', // every day at 21:00 (9 PM)
  name: 'DailyReminderJob',
  description: 'Sends daily reminder if user has not logged expenses today',
  emits: ['sendReminder'],
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

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  for (const user of users) {
    const expensesToday = await expenseRepo
      .createQueryBuilder('expense')
      .where('expense.userId = :userId', { userId: user.id })
      .andWhere('DATE(expense.createdAt) = :today', { today })
      .getMany();
    console.log("check add or not", expensesToday)

    if (expensesToday.length === 0) {
      logger.info('No expense added today, sending reminder', { userId: user.id });

      // Emit event handler

      (emit as any)?.({
        topic: "sendReminder",
        data: {
          templateId: "daily-expense-reminder",
          email: user.email,
          templateData: { name: user.name, date: today },
        },
      });
      console.log("vv")
    }
  }
};
