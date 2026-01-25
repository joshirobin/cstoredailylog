import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import knex from 'knex';
import knexConfig from './knexfile';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const db = knex(knexConfig);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Email Transporter
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === '465',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// --- ACCOUNTS ---
app.get('/api/accounts', async (req, res) => {
    try {
        const data = await db('accounts').select('*').orderBy('name');
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/accounts', async (req, res) => {
    try {
        const [id] = await db('accounts').insert(req.body).returning('id');
        res.json({ id });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- DAILY SALES ---
app.get('/api/sales', async (req, res) => {
    try {
        const data = await db('daily_sales').select('*').orderBy('date', 'desc');
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/sales', async (req, res) => {
    try {
        await db('daily_sales').insert(req.body).onConflict('date').merge();
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- INVOICES ---
app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await db('invoices').select('*').orderBy('created_at', 'desc');
        // Fetch items separately for each (or use a join in a real app)
        res.json(invoices);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/invoices/:id', async (req, res) => {
    try {
        const invoice = await db('invoices').where({ id: req.params.id }).first();
        if (!invoice) return res.status(404).json({ error: 'Not found' });
        const items = await db('invoice_items').where({ invoice_id: req.params.id });
        res.json({ ...invoice, items });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    const { items, ...invoiceData } = req.body;
    const trx = await db.transaction();
    try {
        await trx('invoices').insert(invoiceData);
        if (items && items.length > 0) {
            const itemsToInsert = items.map((item: any) => ({ ...item, invoice_id: invoiceData.id }));
            await trx('invoice_items').insert(itemsToInsert);
        }
        await trx.commit();
        res.json({ success: true, id: invoiceData.id });
    } catch (err: any) {
        await trx.rollback();
        res.status(500).json({ error: err.message });
    }
});

// --- SCANNED LOGS ---
app.get('/api/scanned-logs', async (req, res) => {
    try {
        const data = await db('scanned_logs').select('*').orderBy('created_at', 'desc');
        res.json(data);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/scanned-logs', async (req, res) => {
    try {
        const [id] = await db('scanned_logs').insert(req.body).returning('id');
        res.json({ id });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// --- EMAIL INTEGRATION ---
app.post('/api/send-email', async (req, res) => {
    const { to, subject, body, attachments } = req.body;

    if (!to || !subject) {
        return res.status(400).json({ error: 'Recipients and subject are required.' });
    }

    try {
        const mailOptions: any = {
            from: process.env.EMAIL_FROM || '"C-Store Daily" <billing@cstoredaily.com>',
            to,
            subject,
            text: body,
            html: body.replace(/\n/g, '<br>'),
        };

        if (attachments && Array.isArray(attachments)) {
            mailOptions.attachments = attachments.map((att: any) => ({
                filename: att.name,
                content: att.data.split('base64,')[1],
                encoding: 'base64',
                contentType: att.type
            }));
        }

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: ' + info.messageId);
        res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
        console.error('Email error:', err);
        res.status(500).json({ error: 'Failed to send email: ' + err.message });
    }
});

const PORT = process.env.SERVER_PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
