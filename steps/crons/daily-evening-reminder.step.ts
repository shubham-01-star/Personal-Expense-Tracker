import { EventConfig, Handlers } from 'motia';
import { z } from 'zod';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
dotenv.config();

export const config: EventConfig = {
  type: 'event',
  name: 'SendReminder',
  description: 'Sends OTP or reminder emails to users',
  flows: ['expense-tracker'],
  subscribes: ['sendReminder'],
  emits: [],
  input: z.object({
    templateId: z.string(),
    email: z.string(),
    templateData: z.record(z.string(), z.any()),
  }),
};

export const handler: Handlers['SendReminder'] = async (input, { logger }) => {
  const { email, templateId, templateData } = input;
  // console.log("email",email)
  const redactedEmail = email.replace(/(?<=.{2}).(?=.*@)/g, '*');
  logger.info('Processing email', { templateId, email: redactedEmail });

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

  if (templateId === 'daily-expense-reminder') {
    subject = 'Daily Expense Reminder 📝';
    htmlContent = `
  <div style="
    max-width: 600px;
    margin: 0 auto;
    padding: 30px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    color: #1F2937;
    background: #F9FAFB;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  ">
    <h1 style="font-size: 28px; color: #111827; margin-bottom: 10px;">
      Hello, ${templateData.name} 👋
    </h1>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
      We noticed you haven't added your expense for today 
      <strong>${templateData.date}</strong>.
    </p>
    <p style="font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
      Log it now to keep your budget on track and get accurate insights.
    </p>
    <a href="https://budget-buddy-1054.preview.emergentagent.com/dashboard" 
       style="
         display: inline-block;
         background: linear-gradient(90deg, #6366F1, #4F46E5);
         color: #fff;
         font-weight: 600;
         font-size: 16px;
         padding: 14px 28px;
         border-radius: 8px;
         text-decoration: none;
         transition: all 0.3s ease;
       "
       onmouseover="this.style.background='linear-gradient(90deg, #4F46E5, #6366F1)';"
       onmouseout="this.style.background='linear-gradient(90deg, #6366F1, #4F46E5)';">
      Add Expense
    </a>
    <p style="font-size: 14px; color: #6B7280; margin-top: 30px;">
      Cheers, <br> The Budget Buddy Team
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
    logger.info('Email sent successfully', { email: redactedEmail });
  } catch (err: any) {
    logger.error('Failed to send email', { error: err.message, email: redactedEmail });
  }
};
