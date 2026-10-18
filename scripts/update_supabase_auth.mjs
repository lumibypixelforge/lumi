import fs from 'fs';
import path from 'path';

// Read from .env.local if not in process.env
let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=([^\r\n]+)/);
  if (match) token = match[1].trim();
}

async function updateConfig() {
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN not found in environment or .env.local');
    process.exit(1);
  }

  const res = await fetch('https://api.supabase.com/v1/projects/lbgtrppdeydbhqolahcr/config/auth', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      mailer_autoconfirm: true,
      mailer_otp_length: 6,
      mailer_otp_exp: 1800
    })
  });

  const data = await res.json();
  console.log('Update result:', data);
}

updateConfig().catch(console.error);
