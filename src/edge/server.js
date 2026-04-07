require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { createInvite } = require('./createInvite');

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'change-me';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(bodyParser.json());

// Basic protected endpoint to create invite. In production, validate the caller properly.
app.post('/create-invite', async (req, res) => {
  const auth = req.headers['x-admin-secret'];
  if (!auth || auth !== ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' });

  const { email, role = 'member', expiresHours = 72, created_by = null } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const result = await createInvite({ email, role, created_by, expiresHours });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Invite server running on http://localhost:${PORT}`);
});
