import { EventConfig, Handlers } from 'motia'
import { z } from 'zod'
import * as dotenv from 'dotenv'
import nodemailer from 'nodemailer'
dotenv.config()

export const config: EventConfig = {
  type: 'event',
  name: 'SendOtp',
  description: 'Sends otp to user',
  flows: ['expense-tracker'],
  subscribes: ['send_otp'],
  emits: [],
  input: z.object({
    templateId: z.string(),
    email: z.string(),
    templateData: z.record(z.string(), z.any()),
  }),
}

export const handler: Handlers['SendOtp'] = async (input, { traceId, logger }) => {
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

  if (templateId === 'Otp-send') {
    subject = 'Welcome to Expense Tracker!'
htmlContent = `
  <div style="max-width:600px;margin:0 auto;padding:20px;font-family:Arial,Helvetica,sans-serif;color:#333;line-height:1.6;background:#ffffff;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,0.08);">

    <!-- Header -->
    <h1 style="color:#4F46E5;text-align:center;margin-bottom:10px;">Hello, ${templateData.name} 👋</h1>
    <p style="text-align:center;font-size:16px;margin-top:0;">
      Use the OTP below to verify your email and activate your <strong>Expense Tracker</strong> account.
    </p>

    <!-- OTP Box -->
    <div style="margin:20px auto;padding:20px;text-align:center;background:#f9fafb;border:2px dashed #4F46E5;border-radius:8px;width:fit-content;">
      <p style="margin:0;font-size:18px;font-weight:600;color:#333;">Your OTP Code</p>
      <h2 style="margin:10px 0;font-size:32px;color:#4F46E5;letter-spacing:4px;">${templateData.otp}</h2>
      <p style="margin:0;color:#555;font-size:14px;">This code is valid for <strong>10 minutes</strong></p>
    </div>

    <!-- Security Note -->
    <p style="margin:20px 0;color:#555;">
      ⚠️ Do not share this OTP with anyone. If you didn’t request this, please ignore this email.
    </p>

    <!-- CTA Button -->
    <div style="text-align:center;margin:30px 0;">
      <a href="https://budget-buddy-1054.preview.emergentagent.com/"
         style="background:#4F46E5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
         ✅ Verify Now
      </a>
    </div>

    <!-- Footer -->
    <hr style="margin:30px 0;border:none;border-top:1px solid #eee;" />
    <p style="font-size:12px;color:#777;text-align:center;margin:0;">
      Expense Tracker · Secure Login System
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
