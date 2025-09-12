import PDFDocument from "pdfkit";
import nodemailer from "nodemailer";
import path from "path";
import fs from "fs";

// =======================
// PDF Generator
// =======================
export async function createReportPDF(reportData: any, userName: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {

        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];

        doc.on("data", (chunk) => buffers.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);

        // ✅ Title
        doc.fontSize(18).fillColor("#004080").text("Expense Report", { align: "center" });
        doc.moveDown(1.5);

        // ✅ Meta Info
        doc.fontSize(12).fillColor("black");
        doc.text(`Generated on: ${reportData.summary.generatedOn}`);
        doc.text(`Name: ${userName}`);
        doc.moveDown(1);

        // ✅ Summary
        doc.fontSize(12).fillColor("black");
        doc.text(`Total Expenses: Rs.${reportData.summary.totalExpenses}`);
        doc.text(`Budget: Rs.${reportData.summary.budget}`);
        doc.text(`Remaining: Rs.${reportData.summary.remaining}`);
        doc.moveDown(2);

        // =============================
        // 📂 Category Breakdown Table
        // =============================
        doc.fontSize(14).fillColor("#004080").text("Category Breakdown", { underline: true });
        doc.moveDown(0.5);

        createTable(
            doc,
            ["Category", "Spent", "Budget", "Usage"],
            reportData.categoryBreakdown.map((c: any) => [
                c.category,
                `Rs.${c.spent}`,
                `Rs.${c.budget}`,
                c.usage,
            ]),
            [150, 100, 100, 100]
        );

        // =============================
        // 💳 Transactions
        // =============================
        doc.moveDown(2);
        doc.fontSize(14).fillColor("#004080").text("Transactions", { underline: true });
        doc.moveDown(0.5);

        createTable(
            doc,
            ["Date", "Category", "Description", "Amount"],
            reportData.transactions.map((t: any) => [
                t.date,
                t.category,
                t.description,
                `Rs.${t.amount}`,
            ]),
            [100, 100, 200, 100]
        );

        // =============================
        // 🔄 Recurring Expenses
        // =============================
        if (reportData.recurringExpenses?.length) {
            doc.moveDown(2);
            doc.fontSize(14).fillColor("#004080").text("Recurring Expenses", { underline: true });
            doc.moveDown(0.5);

            createTable(
                doc,
                ["Category", "Description", "Amount", "Frequency", "Status"],
                reportData.recurringExpenses.map((r: any) => [
                    r.category,
                    r.description,
                    `Rs.${r.amount}`,
                    r.frequency,
                    r.status,
                ]),
                [100, 150, 80, 100, 100]
            );
        }

        doc.end();
    });
}

// 🔧 Table Helper with Alignment
function createTable(
    doc: PDFKit.PDFDocument,
    headers: string[],
    rows: string[][],
    colWidths: number[]
) {
    const startX = 50;
    let y = doc.y;

    // --- Header Row ---
    headers.forEach((h, i) => {
        const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
        doc.rect(x, y, colWidths[i], 20).fill("#004080").stroke();
        doc.fillColor("#fff").fontSize(10).text(h, x + 5, y + 5, { width: colWidths[i] - 10, align: "left" });
    });

    y += 20;

    // --- Data Rows ---
    rows.forEach((row, rowIndex) => {
        const bg = rowIndex % 2 === 0 ? "#f9f9f9" : "#fff";
        doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), 20).fill(bg);

        row.forEach((cell, i) => {
            const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
            doc.fillColor("#000").fontSize(10).text(cell, x + 5, y + 5, {
                width: colWidths[i] - 10,
                align: "left", // ✅ Always Left Align
            });
        });

        y += 20;
    });

    // ✅ Move cursor to left again for next content
    doc.y = y + 10;
    doc.x = startX;
}




// =======================
// Email Sender
// =======================
export async function sendMonthlyReport(email: string, pdfBuffer: Buffer, userName?: string) {
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465, // SSL on port 465
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const from = process.env.SMPT_EMAIL || process.env.SMTP_USER || "noreply@expensetracker.com";

    const htmlContent = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background:#f6f9fc; padding:30px; color:#333;">
    <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:10px; box-shadow:0 2px 8px rgba(0,0,0,0.05); overflow:hidden;">
      
      <!-- Header -->
      <div style="background:#4A90E2; color:#fff; padding:20px; text-align:center;">
        <h2 style="margin:0; font-size:22px;">📊 Monthly Expense Report</h2>
      </div>

      <!-- Body -->
      <div style="padding:25px;">
        <p style="font-size:15px;">Hi <b>${userName || "User"}</b>,</p>
        <p style="font-size:14px; line-height:1.6;">
          Your detailed monthly expense report is ready 🎉  
          We've attached it in PDF format. Inside you’ll find:
        </p>

        <ul style="font-size:14px; line-height:1.6; padding-left:20px; margin:15px 0;">
          <li>✅ Summary & Insights</li>
          <li>📂 Category-wise Spending</li>
          <li>💳 Transactions</li>
          <li>🔄 Recurring Expenses</li>
        </ul>

        <!-- CTA Button -->
        <div style="text-align:center; margin:25px 0;">
          <a href="#" style="background:#4A90E2; color:#fff; padding:12px 24px; 
              text-decoration:none; border-radius:6px; font-size:14px; display:inline-block;">
            View Full Report
          </a>
        </div>

        <p style="font-size:14px; line-height:1.6; margin-top:20px;">
          You can also download the attached PDF for complete details 📑
        </p>
      </div>

      <!-- Footer -->
      <div style="background:#f1f5f9; padding:15px; text-align:center; font-size:12px; color:#888;">
        This is an automated email from <b>Expense Tracker</b>.<br/>
        © ${new Date().getFullYear()} Expense Tracker. All rights reserved.
      </div>
    </div>
  </div>
`;


    await transporter.sendMail({
        from: `"Expense Tracker" <${from}>`,
        to: email,
        subject: "📊 Your Monthly Expense Report",
        html: htmlContent,
        attachments: [
            {
                filename: "monthly-report.pdf",
                content: pdfBuffer,
            },
        ],
    });

    console.log("✅ Monthly report email sent to:", email);
}
