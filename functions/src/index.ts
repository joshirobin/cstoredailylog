import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as nodemailer from "nodemailer";
import * as cors from "cors";

const corsHandler = cors({ origin: true });

// Configure Nodemailer transporter
// Note: It's best practice to use Firebase Secrets for sensitive credentials.
// For now, we will use process.env derived from standard environment configuration.
// In Cloud Functions Gen 2, we should use defineSecret or set env vars.
// Assuming we are just migrating the logic for now.

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_PORT === "465",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export const api = onRequest((req, res) => {
    corsHandler(req, res, async () => {
        // Simple routing for the "api" function
        const path = req.path;

        if (path === "/send-email" && req.method === "POST") {
            await handleSendEmail(req, res);
        } else {
            res.status(404).json({ error: "Endpoint not found" });
        }
    });
});

async function handleSendEmail(req: any, res: any) {
    const { to, subject, body, attachments } = req.body;

    if (!to || !subject) {
        return res.status(400).json({ error: "Recipients and subject are required." });
    }

    try {
        const mailOptions: any = {
            from: process.env.EMAIL_FROM || '"C-Store Daily" <noreply@cstoredaily.com>',
            to,
            subject,
            text: body,
            html: body.replace(/\\n/g, "<br>"),
        };

        if (attachments && Array.isArray(attachments)) {
            mailOptions.attachments = attachments.map((att: any) => ({
                filename: att.name,
                content: att.data.split("base64,")[1],
                encoding: "base64",
                contentType: att.type,
            }));
        }

        const info = await transporter.sendMail(mailOptions);
        logger.info("Email sent: " + info.messageId);
        res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
        logger.error("Email error:", err);
        res.status(500).json({ error: "Failed to send email: " + err.message });
    }
}
