import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendRenewalEmail({
  to,
  studentName,
  organizationName,
  planName,
  expiryDate,
  daysRemaining,
}: {
  to: string;
  studentName: string;
  organizationName: string;
  planName: string;
  expiryDate: string;
  daysRemaining: number;
}) {
  if (!to) {
    throw new Error("Student email is missing");
  }

  const subject =
    daysRemaining === 1
      ? `Your StudySphere membership expires tomorrow`
      : `Your StudySphere membership expires in ${daysRemaining} days`;

  const html = `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background:#f5f7fa; padding:30px;">
        <div style="max-width:600px;margin:auto;background:white;padding:30px;border-radius:10px;">
          
          <h2>Membership Renewal Reminder</h2>

          <p>Hi <strong>${studentName}</strong>,</p>

          <p>
            Your membership at <strong>${organizationName}</strong>
            is expiring soon.
          </p>

          <div style="background:#f5f5f5;padding:20px;border-radius:8px;">
            <p><strong>Plan:</strong> ${planName}</p>
            <p><strong>Expiry Date:</strong> ${expiryDate}</p>
            <p><strong>Days Remaining:</strong> ${daysRemaining}</p>
          </div>

          <p>
            Please renew your membership before the expiry date
            to continue using the reading room.
          </p>

          <p>Thank you,<br/>${organizationName}</p>

        </div>
      </body>
    </html>
  `;

  const text = `
Hi ${studentName},

Your ${planName} membership at ${organizationName}
expires in ${daysRemaining} day(s).

Expiry date: ${expiryDate}

Please renew your membership to continue using the reading room.

Thank you,
${organizationName}
`;

  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });

  console.log(
    `[Email] Renewal email sent to ${to}: ${info.messageId}`
  );

  return info;
}