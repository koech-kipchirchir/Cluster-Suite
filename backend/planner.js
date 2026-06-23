const express = require('express');
const router = express.Router();
const dbAsync = require('./utils/db-async');
const auth = require('./middleware/auth');
const axios = require('axios');
const crypto = require('crypto');
const twilio = require('twilio');
const { getEventPlanningAdvice, generateEventPlan } = require('./services/llmService');
const { sendEventDueAlert } = require('./services/notificationService');

// Simple in-memory mpesa request store for quick lookup (still persist to DB)
const mpesaRequests = {};

const MPESA_ENV = process.env.MPESA_ENV || 'sandbox';
const MPESA_BASE_URL = MPESA_ENV === 'production'
  ? 'https://api.safaricom.co.ke'
  : 'https://sandbox.safaricom.co.ke';

const formatMpesaPhone = (phone) => {
  if (!phone) return '';
  const normalized = String(phone).trim();
  if (normalized.startsWith('0')) return `254${normalized.slice(1)}`;
  if (normalized.startsWith('+')) return normalized.slice(1);
  if (normalized.startsWith('254')) return normalized;
  return normalized;
};

const getMpesaTimestamp = () => {
  const date = new Date();
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
};

const getMpesaAccessToken = async () => {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET');
  const token = Buffer.from(`${key}:${secret}`).toString('base64');
  const response = await axios.get(`${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${token}` },
  });
  return response.data.access_token;
};

const getStkPassword = (timestamp) => {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  if (!shortcode || !passkey) throw new Error('Missing MPESA_SHORTCODE or MPESA_PASSKEY');
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
};

const sendSms = async (to, body) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (sid && token && from) {
    const client = twilio(sid, token);
    return client.messages.create({ to, from, body });
  }
  console.log(`SMS to ${to}: ${body}`);
  return Promise.resolve({ sid: 'dev', body });
};

// GET events for user
router.get('/', auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all('SELECT * FROM events WHERE user_id = ? ORDER BY date ASC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST create a new event
router.post('/', auth, async (req, res, next) => {
  try {
    const { name, date, budget_goal, current_savings, notes, type } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Event name is required' });
    }

    const result = await dbAsync.run(
      'INSERT INTO events (user_id, name, date, budget_goal, current_savings, notes, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [req.user.id, name.trim(), date || null, parseFloat(budget_goal) || 0, parseFloat(current_savings) || 0, notes || null, type || 'General']
    );

    const event = await dbAsync.get('SELECT * FROM events WHERE id = ?', [result.id]);
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
});

// POST generate a complete event setup using AI
router.post('/ai-generate-plan', auth, async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const plan = await generateEventPlan(prompt.trim());

    // 1. Create the event
    const eventResult = await dbAsync.run(
      'INSERT INTO events (user_id, name, date, budget_goal, current_savings, notes, type, ai_plan, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
      [
        req.user.id,
        plan.event.name,
        plan.event.date || null,
        parseFloat(plan.event.budget_goal) || 0,
        0, // Start with 0 savings for AI-generated event
        plan.event.notes || null,
        plan.event.type || 'General',
        plan.event.notes || null // Save plan summary as ai_plan
      ]
    );
    const eventId = eventResult.id;

    // 2. Create the linked wallet
    let walletId = null;
    if (plan.wallet) {
      const walletResult = await dbAsync.run(
        'INSERT INTO wallets (user_id, name, type, balance, target_amount, event_id, notes, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)',
        [
          req.user.id,
          plan.wallet.name,
          plan.wallet.type || 'Savings',
          parseFloat(plan.wallet.target_amount) || parseFloat(plan.event.budget_goal) || 0,
          eventId,
          plan.wallet.notes || ''
        ]
      );
      walletId = walletResult.id;
    }

    // 3. Create tasks
    const createdTasks = [];
    if (Array.isArray(plan.tasks)) {
      for (const t of plan.tasks) {
        const taskResult = await dbAsync.run(
          `INSERT INTO tasks (title, notes, category, board, priority, completed, due_date, recurrence, reminder_date, reminder_time, reminder_channel, estimated_minutes, user_id, event_id) VALUES (?, ?, ?, ?, ?, 0, ?, null, null, null, 'email', null, ?, ?)`,
          [
            t.title?.trim() || "Untitled Task",
            t.notes || null,
            t.category || "Personal",
            t.board || "To Do",
            t.priority || "Medium",
            t.due_date || null,
            req.user.id,
            eventId
          ]
        );
        createdTasks.push({ id: taskResult.id, title: t.title });
      }
    }

    res.json({
      message: `AI Event plan generated! Created event "${plan.event.name}", linked wallet, and ${createdTasks.length} task(s).`,
      event: {
        id: eventId,
        name: plan.event.name,
        date: plan.event.date,
        budget_goal: plan.event.budget_goal
      },
      wallet: plan.wallet ? {
        id: walletId,
        name: plan.wallet.name,
        target_amount: plan.wallet.target_amount
      } : null,
      tasks: createdTasks
    });
  } catch (err) {
    next(err);
  }
});

// GET wallets with optional event name
router.get('/wallets', auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all(
      `SELECT wallets.*, events.name AS event_name
       FROM wallets
       LEFT JOIN events ON wallets.event_id = events.id
       WHERE wallets.user_id = ?
       ORDER BY wallets.name ASC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST create new wallet
router.post('/wallets', auth, async (req, res, next) => {
  try {
    const { name, type, currentBalance, targetAmount, eventId, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Wallet name is required' });
    }

    const result = await dbAsync.run(
      'INSERT INTO wallets (user_id, name, type, balance, target_amount, event_id, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      [req.user.id, name.trim(), type || 'Savings', parseFloat(currentBalance) || 0, parseFloat(targetAmount) || 0, eventId || null, notes || '']
    );

    const wallet = await dbAsync.get('SELECT * FROM wallets WHERE id=?', [result.id]);
    res.status(201).json(wallet);
  } catch (err) {
    next(err);
  }
});

// POST generic manual deposit (non-M-Pesa payment methods)
router.post('/wallets/:id/deposit', auth, async (req, res, next) => {
  try {
    const wallet = await dbAsync.get('SELECT * FROM wallets WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    const { amount, method, reference } = req.body;
    const numericAmount = parseFloat(amount) || 0;
    if (numericAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const newBalance = (parseFloat(wallet.balance) || 0) + numericAmount;
    const note = `\nDeposit via ${method || 'Manual'}${reference ? ` (ref: ${reference})` : ''}: ${numericAmount}`;
    await dbAsync.run(
      'UPDATE wallets SET balance=?, notes=COALESCE(notes,"")||?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
      [newBalance, note, wallet.id, req.user.id]
    );
    if (wallet.event_id) {
      await dbAsync.run('UPDATE events SET current_savings=current_savings+?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?', [numericAmount, wallet.event_id, req.user.id]);
    }

    // Log in general transactions table
    const txId = `MAN_${Date.now()}`;
    await dbAsync.run(
      `INSERT INTO transactions (merchant_request_id, user_id, wallet_id, amount, phone, status, receipt, method, reference, daraja_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, req.user.id, wallet.id, numericAmount, null, 'completed', reference || null, method || 'manual', reference || null, JSON.stringify({ manual: true })]
    );

    const updated = await dbAsync.get('SELECT * FROM wallets WHERE id=?', [wallet.id]);
    res.json({ message: 'Deposit successful', wallet: updated });
  } catch (err) { next(err); }
});

// POST withdrawal from wallet (only allowed when linked event is due/overdue or no event)
router.post('/wallets/:id/withdraw', auth, async (req, res, next) => {
  try {
    const wallet = await dbAsync.get(
      `SELECT wallets.*, events.date AS event_date FROM wallets
       LEFT JOIN events ON wallets.event_id = events.id
       WHERE wallets.id=? AND wallets.user_id=?`,
      [req.params.id, req.user.id]
    );
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    // If linked to an event, event must be due or overdue
    if (wallet.event_id && wallet.event_date) {
      const eventDate = new Date(wallet.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (eventDate > today) {
        return res.status(403).json({ message: 'Withdrawal not allowed yet. Event is not due until ' + wallet.event_date });
      }
    }

    const { amount, method, reference } = req.body;
    const numericAmount = parseFloat(amount) || 0;
    const currentBalance = parseFloat(wallet.balance) || 0;

    if (numericAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    if (numericAmount > currentBalance) return res.status(400).json({ message: 'Insufficient balance' });

    const newBalance = currentBalance - numericAmount;
    const note = `\nWithdrawal via ${method || 'Manual'}${reference ? ` (ref: ${reference})` : ''}: -${numericAmount}`;
    await dbAsync.run(
      'UPDATE wallets SET balance=?, notes=COALESCE(notes,"")||?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
      [newBalance, note, wallet.id, req.user.id]
    );
    if (wallet.event_id) {
      await dbAsync.run('UPDATE events SET current_savings=MAX(0,current_savings-?), updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?', [numericAmount, wallet.event_id, req.user.id]);
    }

    // Log in general transactions table as negative amount (withdrawal)
    const txId = `WD_${Date.now()}`;
    await dbAsync.run(
      `INSERT INTO transactions (merchant_request_id, user_id, wallet_id, amount, phone, status, receipt, method, reference, daraja_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [txId, req.user.id, wallet.id, -numericAmount, null, 'completed', reference || null, method || 'manual', reference || null, JSON.stringify({ withdrawal: true })]
    );

    const updated = await dbAsync.get('SELECT * FROM wallets WHERE id=?', [wallet.id]);
    res.json({ message: 'Withdrawal successful', wallet: updated });
  } catch (err) { next(err); }
});

// Minimal STK push route with dev mock when credentials are missing
router.post('/wallets/:id/stk-push', auth, async (req, res, next) => {

  try {
    const wallet = await dbAsync.get('SELECT * FROM wallets WHERE id=? AND user_id=?', [req.params.id, req.user.id]);
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });

    const { amount, phone } = req.body;
    const numericAmount = parseFloat(amount) || 0;
    if (!numericAmount || numericAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });
    if (!phone || typeof phone !== 'string') return res.status(400).json({ message: 'Phone number is required' });

    const msisdn = formatMpesaPhone(phone);

    const missingCreds = !process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET || !process.env.MPESA_SHORTCODE || !process.env.MPESA_PASSKEY;
    if (missingCreds) {
      // Dev mock: persist a dev request record and immediately apply deposit so frontend can continue development without Daraja
      const fakeId = `DEV_${Date.now()}`;
      const receipt = `DEVRECEIPT_${Date.now()}`;
      mpesaRequests[fakeId] = {
        userId: req.user.id,
        walletId: wallet.id,
        amount: numericAmount,
        phone: msisdn,
        status: 'completed',
        createdAt: Date.now(),
        receipt,
      };

      // Persist to DB
      await dbAsync.run(
        'INSERT INTO transactions (merchant_request_id, user_id, wallet_id, amount, phone, status, receipt, daraja_response, method) VALUES (?,?,?,?,?,?,?,?,?)',
        [fakeId, req.user.id, wallet.id, numericAmount, msisdn, 'completed', receipt, JSON.stringify({ dev: true }), 'mpesa']
      );

      const newBalance = (parseFloat(wallet.balance) || 0) + numericAmount;
      await dbAsync.run(
        'UPDATE wallets SET balance=?, notes = COALESCE(notes, "") || ? , updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
        [newBalance, `\nDEV M-Pesa STK Push deposit: ${numericAmount} (dev)`, wallet.id, req.user.id]
      );
      if (wallet.event_id) {
        await dbAsync.run('UPDATE events SET current_savings = current_savings + ?, updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?', [numericAmount, wallet.event_id, req.user.id]);
      }

      return res.json({ message: 'M-Pesa mock push completed (dev)', merchantRequestID: fakeId, receipt });
    }

    // Real Daraja flow
    const accessToken = await getMpesaAccessToken();
    const timestamp = getMpesaTimestamp();
    const password = getStkPassword(timestamp);
    const shortcode = process.env.MPESA_SHORTCODE;
    const callbackUrl = process.env.CALLBACK_URL || `http://localhost:${process.env.PORT || 5000}/api/planner/mpesa-callback`;

    const payload = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: numericAmount,
      PartyA: msisdn,
      PartyB: shortcode,
      PhoneNumber: msisdn,
      CallBackURL: callbackUrl,
      AccountReference: `Wallet-${wallet.id}`,
      TransactionDesc: `Deposit to ${wallet.name}`,
    };

    const response = await axios.post(`${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`, payload, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.data.ResponseCode !== '0') {
      return res.status(400).json({ message: 'M-Pesa push failed', details: response.data });
    }

    const merchantId = response.data.MerchantRequestID || response.data.CheckoutRequestID || null;

    // Persist pending request
    await dbAsync.run(
      'INSERT INTO transactions (merchant_request_id, checkout_request_id, user_id, wallet_id, amount, phone, status, daraja_response, method) VALUES (?,?,?,?,?,?,?,?,?)',
      [response.data.MerchantRequestID || null, response.data.CheckoutRequestID || null, req.user.id, wallet.id, numericAmount, msisdn, 'pending', JSON.stringify(response.data), 'mpesa']
    );

    mpesaRequests[merchantId || `RID_${Date.now()}`] = {
      userId: req.user.id,
      walletId: wallet.id,
      amount: numericAmount,
      phone: msisdn,
      status: 'pending',
      createdAt: Date.now(),
    };

    res.json({ message: 'M-Pesa push initiated', data: response.data });
  } catch (err) {
    console.error('M-Pesa STK push error:', err?.response?.data || err.message || err);
    const errorInfo = err.response?.data || err.message || 'Unknown error';
    return res.status(err.response?.status || 500).json({ message: 'M-Pesa push failed', details: errorInfo });
  }
});

// Daraja/STK push callback endpoint
router.post('/mpesa-callback', async (req, res, next) => {
  try {
    const body = req.body || {};
    const stk = body.Body && body.Body.stkCallback ? body.Body.stkCallback : body.stkCallback || null;
    if (!stk) return res.status(400).json({ message: 'Invalid callback payload' });

    const resultCode = stk.ResultCode;
    const merchantRequestID = stk.MerchantRequestID || null;
    const checkoutRequestID = stk.CheckoutRequestID || null;

    // Find the persisted request
    let row = null;
    if (merchantRequestID) row = await dbAsync.get('SELECT * FROM transactions WHERE merchant_request_id = ?', [merchantRequestID]);
    if (!row && checkoutRequestID) row = await dbAsync.get('SELECT * FROM transactions WHERE checkout_request_id = ?', [checkoutRequestID]);

    const darajaJson = JSON.stringify(stk);

    if (resultCode === 0) {
      // Extract amount and receipt from CallbackMetadata
      let amount = null;
      let receipt = null;
      const items = (stk.CallbackMetadata && stk.CallbackMetadata.Item) || (stk.CallbackMetadata && stk.CallbackMetadata.items) || (stk.CallbackMetadata && stk.CallbackMetadata.Items) || [];
      items.forEach((it) => {
        const name = it.Name || it.name || it.key || '';
        if (name.toLowerCase().includes('amount')) amount = it.Value || it.value;
        if (name.toLowerCase().includes('mpesareceiptnumber') || name.toLowerCase().includes('receipt')) receipt = it.Value || it.value;
      });

      // Update transactions row
      if (row) {
        await dbAsync.run('UPDATE transactions SET status=?, receipt=?, daraja_response=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['completed', receipt || null, darajaJson, row.id]);

        // Apply to wallet
        const wallet = await dbAsync.get('SELECT * FROM wallets WHERE id=?', [row.wallet_id]);
        if (wallet) {
          const newBalance = (parseFloat(wallet.balance) || 0) + (amount || row.amount || 0);
          await dbAsync.run('UPDATE wallets SET balance=?, notes = COALESCE(notes, "") || ? , updated_at=CURRENT_TIMESTAMP WHERE id=?', [newBalance, `\nM-Pesa STK deposit: ${amount || row.amount} receipt:${receipt || ''}`, wallet.id]);
          if (wallet.event_id) {
            await dbAsync.run('UPDATE events SET current_savings = current_savings + ?, updated_at=CURRENT_TIMESTAMP WHERE id=?', [amount || row.amount || 0, wallet.event_id]);
          }
        }
      }

      // keep in-memory quick lookup
      if (merchantRequestID) mpesaRequests[merchantRequestID] = { status: 'completed' };
      if (checkoutRequestID) mpesaRequests[checkoutRequestID] = { status: 'completed' };

      // Respond quickly to Daraja
      return res.json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    // Non-zero result -> failed or canceled
    if (row) {
      await dbAsync.run('UPDATE transactions SET status=?, daraja_response=?, updated_at=CURRENT_TIMESTAMP WHERE id=?', ['failed', darajaJson, row.id]);
    }

    if (merchantRequestID) mpesaRequests[merchantRequestID] = { status: 'failed' };
    if (checkoutRequestID) mpesaRequests[checkoutRequestID] = { status: 'failed' };

    return res.json({ ResultCode: 0, ResultDesc: 'Received' });
  } catch (err) {
    console.error('MPesa callback processing error:', err);
    return res.status(500).json({ message: 'Callback processing error' });
  }
});

// GET transactions for user
router.get('/transactions', auth, async (req, res, next) => {
  try {
    const rows = await dbAsync.all(
      `SELECT transactions.*, wallets.name AS wallet_name
       FROM transactions
       LEFT JOIN wallets ON transactions.wallet_id = wallets.id
       WHERE transactions.user_id = ?
       ORDER BY transactions.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET planner event templates (static curated list)
router.get('/templates', auth, (req, res) => {
  const templates = [
    { id: 1, name: 'Wedding',     icon: '💍', type: 'Wedding',  defaultBudget: 500000 },
    { id: 2, name: 'Travel',      icon: '✈️', type: 'Travel',   defaultBudget: 150000 },
    { id: 3, name: 'Birthday',    icon: '🎂', type: 'Birthday', defaultBudget: 20000  },
    { id: 4, name: 'Education',   icon: '🎓', type: 'General',  defaultBudget: 100000 },
    { id: 5, name: 'Emergency Fund', icon: '🛡️', type: 'General', defaultBudget: 50000 },
    { id: 6, name: 'Home Project',icon: '🏠', type: 'Project',  defaultBudget: 200000 },
  ];
  res.json(templates);
});

// POST AI assist for a specific event
router.post('/:id/ai-assist', auth, async (req, res, next) => {
  try {
    const event = await dbAsync.get(
      'SELECT * FROM events WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const ai_plan = await getEventPlanningAdvice(event);

    // Persist the generated plan to the event record
    await dbAsync.run(
      'UPDATE events SET ai_plan = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
      [ai_plan, event.id, req.user.id]
    );

    res.json({ ai_plan });
  } catch (err) {
    next(err);
  }
});

// POST duplicate an event and its linked wallets
router.post('/:id/duplicate', auth, async (req, res, next) => {
  try {
    const event = await dbAsync.get(
      'SELECT * FROM events WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const result = await dbAsync.run(
      'INSERT INTO events (user_id, name, date, budget_goal, current_savings, notes, type, ai_plan, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
      [req.user.id, `${event.name} (Copy)`, event.date, event.budget_goal, 0, event.notes, event.type, null]
    );
    const newEventId = result.id;

    // Duplicate linked wallets (reset balance to 0)
    const wallets = await dbAsync.all('SELECT * FROM wallets WHERE event_id = ? AND user_id = ?', [event.id, req.user.id]);
    for (const w of wallets) {
      await dbAsync.run(
        'INSERT INTO wallets (user_id, name, type, balance, target_amount, event_id, notes, created_at, updated_at) VALUES (?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)',
        [req.user.id, w.name, w.type, 0, w.target_amount, newEventId, w.notes]
      );
    }

    res.json({ message: 'Event duplicated', id: newEventId, wallet_count: wallets.length });
  } catch (err) {
    next(err);
  }
});

// POST /notify-due-events — called by the scheduler or manually
// Checks all events due today / within 3 days / overdue and sends alerts
router.post('/notify-due-events', async (req, res, next) => {
  // Allow internal calls (with server secret) or skip auth for scheduler
  const secret = req.headers['x-internal-secret'];
  if (secret !== (process.env.INTERNAL_SECRET || 'cluster-internal')) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in3Days = new Date(today);
    in3Days.setDate(today.getDate() + 3);

    // Fetch events with a date, joining user contact info
    const events = await dbAsync.all(`
      SELECT events.*, users.username, users.email, users.phone
      FROM events
      JOIN users ON events.user_id = users.id
      WHERE events.date IS NOT NULL AND events.date != ''
    `);

    const alerts = [];

    for (const ev of events) {
      const evDate = new Date(ev.date);
      evDate.setHours(0, 0, 0, 0);
      const daysLeft = Math.round((evDate - today) / (1000 * 60 * 60 * 24));

      // Alert for: today (0), 1 day, 3 days, or overdue (negative)
      const shouldAlert = daysLeft === 0 || daysLeft === 1 || daysLeft === 3 || (daysLeft < 0 && daysLeft >= -7);
      if (!shouldAlert) continue;

      const user = { id: ev.user_id, username: ev.username, email: ev.email, phone: ev.phone };
      const event = { id: ev.id, name: ev.name, date: ev.date, budget_goal: ev.budget_goal, current_savings: ev.current_savings, notes: ev.notes };

      const result = await sendEventDueAlert({ user, event, daysLeft });
      alerts.push({ eventId: ev.id, eventName: ev.name, daysLeft, result });
    }

    console.log(`[Scheduler] Processed ${alerts.length} event alert(s).`);
    res.json({ processed: alerts.length, alerts });
  } catch (err) {
    next(err);
  }
});

// POST planner recommendations (derived from user events)
router.post('/recommendations', auth, async (req, res, next) => {
  try {
    const events = await dbAsync.all(
      'SELECT * FROM events WHERE user_id = ? ORDER BY date ASC',
      [req.user.id]
    );

    const recommendations = [];

    for (const ev of events) {
      const goal = parseFloat(ev.budget_goal) || 0;
      const saved = parseFloat(ev.current_savings) || 0;
      const progress = goal > 0 ? (saved / goal) * 100 : 0;

      // Upcoming event with low savings
      if (ev.date) {
        const daysLeft = Math.ceil((new Date(ev.date) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysLeft > 0 && daysLeft <= 30 && progress < 80) {
          recommendations.push({
            eventId: ev.id,
            eventName: ev.name,
            type: 'urgent',
            message: `"${ev.name}" is in ${daysLeft} day${daysLeft === 1 ? '' : 's'} and only ${progress.toFixed(0)}% funded. Consider boosting your savings now.`,
          });
        }
      }

      // Significantly underfunded events
      if (goal > 0 && progress < 30 && !recommendations.find(r => r.eventId === ev.id)) {
        recommendations.push({
          eventId: ev.id,
          eventName: ev.name,
          type: 'underfunded',
          message: `"${ev.name}" is only ${progress.toFixed(0)}% funded. Set up a regular savings plan to reach your goal.`,
        });
      }
    }

    res.json({ recommendations: recommendations.slice(0, 5) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
