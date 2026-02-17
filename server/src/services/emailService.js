import nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import sgMail from '@sendgrid/mail';

function brand() {
  return {
    name: process.env.BRAND_NAME || 'AeroMaintain',
    primary: process.env.BRAND_PRIMARY_COLOR || '#4f46e5',
    logo: process.env.BRAND_LOGO_URL || '',
    support: process.env.BRAND_SUPPORT_EMAIL || (process.env.SMTP_FROM || process.env.SMTP_USER || '')
  };
}

function buildResetTemplate(link) {
  const b = brand();
  const subject = `Redefinição de Senha – ${b.name}`;
  const text = [
    `Recebemos uma solicitação de redefinição de senha.`,
    `Use o link para redefinir:`,
    link,
    ``,
    `Se não foi você, ignore este email.`,
    b.support ? `Suporte: ${b.support}` : ''
  ].filter(Boolean).join('\n');
  const html = `
  <div style="background:#f6f7fb;padding:32px 0">
    <div style="max-width:560px;margin:auto;background:#ffffff;border-radius:12px;box-shadow:0 10px 20px rgba(0,0,0,0.06);overflow:hidden">
      <div style="padding:24px;border-bottom:1px solid #eef1f5;display:flex;align-items:center;gap:12px">
        ${b.logo ? `<img src="${b.logo}" alt="${b.name}" style="height:32px">` : `<div style="width:32px;height:32px;border-radius:8px;background:${b.primary};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-family:Arial">AM</div>`}
        <span style="font-size:16px;font-weight:800;color:#111827;font-family:Arial">${b.name}</span>
      </div>
      <div style="padding:28px 24px 12px 24px">
        <h1 style="font-family:Arial;font-size:18px;color:#111827;margin:0 0 8px 0">Redefinição de Senha</h1>
        <p style="font-family:Arial;font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px 0">
          Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para continuar.
        </p>
        <div style="margin:18px 0">
          <a href="${link}" style="display:inline-block;background:${b.primary};color:#ffffff;text-decoration:none;font-weight:800;font-family:Arial;border-radius:10px;padding:12px 18px">Redefinir Senha</a>
        </div>
        <p style="font-family:Arial;font-size:12px;color:#6b7280;line-height:1.6;margin:12px 0">
          Se o botão não funcionar, copie e cole este link no navegador:<br>
          <a href="${link}" style="color:${b.primary};word-break:break-all">${link}</a>
        </p>
      </div>
      <div style="padding:18px 24px;border-top:1px solid #eef1f5">
        <p style="font-family:Arial;font-size:12px;color:#6b7280;margin:0">
          Se você não solicitou esta ação, pode ignorar este email.
          ${b.support ? `<br>Suporte: <a href="mailto:${b.support}" style="color:${b.primary}">${b.support}</a>` : ''}
        </p>
      </div>
    </div>
  </div>
  `;
  return { subject, text, html, fromName: b.name };
}

function getSmtpTransport() {
  const host = process.env.SMTP_HOST || '';
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

function getSesClient() {
  const region = process.env.SES_REGION || '';
  const accessKeyId = process.env.SES_ACCESS_KEY_ID || '';
  const secretAccessKey = process.env.SES_SECRET_ACCESS_KEY || '';
  if (!region || !accessKeyId || !secretAccessKey) return null;
  return new SESClient({ region, credentials: { accessKeyId, secretAccessKey } });
}

function setupSendGrid() {
  const key = process.env.SENDGRID_API_KEY || '';
  if (!key) return false;
  sgMail.setApiKey(key);
  return true;
}

export async function sendResetEmail(to, link) {
  if (process.env.EMAIL_DISABLED === '1') return;
  const tpl = buildResetTemplate(link);
  const provider = (process.env.MAIL_PROVIDER || 'SMTP').toUpperCase();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || to;

  if (provider === 'SMTP') {
    const transporter = getSmtpTransport();
    if (!transporter) return;
    await transporter.sendMail({
      from: `"${tpl.fromName}" <${from}>`,
      to,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html
    });
    return;
  }

  if (provider === 'SES') {
    const ses = getSesClient();
    if (!ses) return;
    const cmd = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: tpl.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: tpl.html, Charset: 'UTF-8' },
          Text: { Data: tpl.text, Charset: 'UTF-8' }
        }
      },
      Source: from
    });
    await ses.send(cmd);
    return;
  }

  if (provider === 'SENDGRID') {
    if (!setupSendGrid()) return;
    await sgMail.send({
      to,
      from,
      subject: tpl.subject,
      text: tpl.text,
      html: tpl.html
    });
    return;
  }
}
