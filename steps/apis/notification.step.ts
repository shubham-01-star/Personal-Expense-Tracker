import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import * as dotenv from 'dotenv'
import nodemailer from 'nodemailer'
dotenv.config()

export const config: EventConfig = {
  type: 'event',
  name: 'Notification',
  description: 'Sends notifications to users',
  flows: ['expense-tracker'],
  subscribes: ['notification'],
  emits: [],
  input: z.object({
    templateId: z.string(),
    email: z.string(),
    templateData: z.record(z.string(), z.any()),
  }),
}

export const handler: Handlers['Notification'] = async (input, { traceId, logger }) => {
  const { email, templateId, templateData } = input

  const redactedEmail = email.replace(/(?<=.{2}).(?=.*@)/g, '*')
  logger.info('Processing Notification', { templateId, email: redactedEmail })

  // Create Nodemailer transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
  console.log("Nodemailer transporter created");

  // Check which template to send
  let subject = ''
  let htmlContent = ''

  if (templateId === 'welcome-email') {
    subject = 'Welcome to Expense Tracker!'
    htmlContent = `
  <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;background:#ffffff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <h1 style="color:#4F46E5;text-align:center;margin-bottom:10px;">Welcome, ${templateData.name} 🎉</h1>
    <p style="text-align:center;font-size:16px;margin-top:0;">
      Thanks for signing up to <strong>Expense Tracker</strong>.<br/>We’re excited to have you on board!
    </p>

    <!-- Tips Section -->
    <div style="margin:20px 0;padding:15px;background:#f9fafb;border-left:4px solid #4F46E5;border-radius:6px;">
      <p style="margin:0 0 10px;font-weight:600;">Here are some tips to get started:</p>
      <ul style="padding-left:20px;margin:0;">
        <li>💰 Set your monthly budget</li>
        <li>📌 Add your recurring expenses</li>
        <li>📊 Track your spending easily</li>
      </ul>
    </div>

    <!-- Support -->
    <p style="margin:20px 0;">
      Have any questions? Just hit <strong>Reply</strong> — we’re always happy to help!
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;margin:30px 0;">
      <a href="https://budget-buddy-1054.preview.emergentagent.com/"
         style="background:#4F46E5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
         🚀 Go to Dashboard
      </a>
    </div>

    <!-- Footer -->
    <hr style="margin:30px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#777;text-align:center;margin:0;">
      Expense Tracker · 123 Finance Street, Money City
    </p>
  </div>
`

  } else {
    subject = `Notification: ${templateId}`
    htmlContent = `<p>Template: ${templateId}</p>`
  }

  try {
    const send = await transporter.sendMail({
      from: `"Expense Tracker" <${process.env.SMPT_EMAIL}>`,
      to: email,
      subject,
      html: htmlContent,
    })
    // console.log("Email send function executed:", send);
    logger.info('Email sent successfully', { email: redactedEmail })
  } catch (err: any) {
    logger.error('Failed to send email', { error: err.message, email: redactedEmail })
  }
}
