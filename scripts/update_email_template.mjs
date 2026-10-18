import fs from 'fs';

let token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token && fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf-8');
  const match = envContent.match(/SUPABASE_ACCESS_TOKEN=([^\r\n]+)/);
  if (match) token = match[1].trim();
}

async function updateTemplate() {
  if (!token) {
    console.error('SUPABASE_ACCESS_TOKEN not found');
    process.exit(1);
  }

  const subject = 'Your LUMI verification code: {{ .Token }}';
  const content = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0c0d0e; color: #ffffff; border-radius: 8px;">
  <div style="font-size: 13px; letter-spacing: 0.15em; color: #888888; text-transform: uppercase; margin-bottom: 20px;">LUMI · Account Verification</div>
  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff;">Confirm your email address</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #cccccc; margin: 0 0 24px 0;">Use this 6-digit verification code to confirm your email and complete your LUMI reservation:</p>
  
  <div style="background: #18191b; border: 1px solid #2e3034; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0;">
    <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 0.3em; color: #ffffff;">{{ .Token }}</div>
  </div>

  <p style="font-size: 13px; color: #777777; margin: 24px 0 0 0; line-height: 1.5;">This verification code expires in 30 minutes. If you did not create a LUMI account, please ignore this email.</p>
</div>`;

  const magicSubject = 'Your LUMI login code: {{ .Token }}';
  const magicContent = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #0c0d0e; color: #ffffff; border-radius: 8px;">
  <div style="font-size: 13px; letter-spacing: 0.15em; color: #888888; text-transform: uppercase; margin-bottom: 20px;">LUMI · One-Time Password</div>
  <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px 0; color: #ffffff;">Sign in to your LUMI account</h1>
  <p style="font-size: 15px; line-height: 1.6; color: #cccccc; margin: 0 0 24px 0;">Use this 6-digit login code to verify your identity:</p>
  
  <div style="background: #18191b; border: 1px solid #2e3034; border-radius: 6px; padding: 20px; text-align: center; margin: 24px 0;">
    <div style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 0.3em; color: #ffffff;">{{ .Token }}</div>
  </div>

  <p style="font-size: 13px; color: #777777; margin: 24px 0 0 0; line-height: 1.5;">This login code expires in 30 minutes. If you did not request this code, please ignore this email.</p>
</div>`;

  const res = await fetch('https://api.supabase.com/v1/projects/lbgtrppdeydbhqolahcr/config/auth', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify({
      mailer_subjects_confirmation: subject,
      mailer_templates_confirmation_content: content,
      mailer_subjects_magic_link: magicSubject,
      mailer_templates_magic_link_content: magicContent
    })
  });

  const data = await res.json();
  console.log('Confirmation template updated:', data.mailer_subjects_confirmation);
  console.log('Magic link template updated:', data.mailer_subjects_magic_link);
}

updateTemplate().catch(console.error);
