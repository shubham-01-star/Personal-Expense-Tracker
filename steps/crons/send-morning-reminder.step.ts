import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

export const config: EventConfig = {
  type: 'event',
  name: 'SendMorningReminder',
  description: 'Sends morning reminder emails if user missed yesterday’s expense',
  flows: ['expense-tracker'],
  subscribes: ['sendMorningReminder'],
  emits: [],
  input: z.object({
    templateId: z.string(),
    email: z.string(),
    templateData: z.record(z.string(), z.any()),
  }),
};

export const handler: Handlers['SendMorningReminder'] = async (input, { logger }) => {
  const { email, templateId, templateData } = input;
  const redactedEmail = email.replace(/(?<=.{2}).(?=.*@)/g, '*');
  logger.info('Processing morning reminder email', { templateId, email: redactedEmail });

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  let subject = '';
  let htmlContent = '';

  if (templateId === 'daily-expense-morning-reminder') {
    subject = 'Morning Reminder 🌅 – Did you forget yesterday’s expense?';
    htmlContent = `
      <div style="max-width: 600px; margin: 0 auto; padding: 30px;
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  color: #1F2937; background: #FFF7ED; border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
        <h1 style="font-size: 28px; color: #B45309; margin-bottom: 10px;">
          Good Morning, ${templateData.name} ☀️
        </h1>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Looks like you missed logging your expenses yesterday 
          (<strong>${templateData.date}</strong>).
        </p>
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
          Don’t worry, add it now and keep your budget on track 📊.
        </p>
        <a href="https://budget-buddy-1054.preview.emergentagent.com/dashboard" 
           style="display: inline-block; background: linear-gradient(90deg, #F59E0B, #D97706);
                  color: #fff; font-weight: 600; font-size: 16px;
                  padding: 14px 28px; border-radius: 8px; text-decoration: none;
                  transition: all 0.3s ease;">
          Add Yesterday's Expense
        </a>
        <p style="font-size: 14px; color: #92400E; margin-top: 30px;">
          Stay consistent, <br> The Budget Buddy Team
        </p>
      </div>
    `;
  } else {
    subject = `Notification: ${templateId}`;
    htmlContent = `<p>Template: ${templateId}</p>`;
  }

  try {
    await transporter.sendMail({
      from: `"Expense Tracker" <${process.env.SMPT_EMAIL}>`,
      to: email,
      subject,
      html: htmlContent,
    });
    logger.info('Morning reminder email sent successfully', { email: redactedEmail });
  } catch (err: any) {
    logger.error('Failed to send morning reminder email', { error: err.message, email: redactedEmail });
  }
};
