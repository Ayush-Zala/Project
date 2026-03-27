export const getVerificationEmailTemplate = (url: string, name: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Account - Obsidian Noir</title>
  <style>
    body {
      background-color: #0a0a0b;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0a0a0b;
      padding-bottom: 40px;
    }
    .main {
      background-color: #141416;
      margin: 40px auto;
      width: 100%;
      max-width: 500px;
      border-radius: 12px;
      border: 1px solid #27272a;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
      border-spacing: 0;
    }
    .content {
      padding: 40px;
      text-align: center;
    }
    .logo {
      width: 48px;
      height: 48px;
      background: linear-gradient(135deg, #6366f1 0%, #4338ca 100%);
      border-radius: 12px;
      margin: 0 auto 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-weight: bold;
      font-size: 24px;
      line-height: 48px;
      text-align: center;
    }
    h1 {
      color: #fafafa;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 16px;
      letter-spacing: -0.025em;
    }
    p {
      color: #a1a1aa;
      font-size: 16px;
      line-height: 1.5;
      margin: 0 0 24px;
    }
    .button {
      display: inline-block;
      background-color: #6366f1;
      color: #ffffff;
      padding: 14px 28px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      font-size: 16px;
      transition: background-color 0.2s;
    }
    .footer {
      padding: 24px;
      color: #71717a;
      font-size: 12px;
      text-align: center;
    }
    .divider {
      height: 1px;
      background-color: #27272a;
      margin: 0 40px;
    }
    .link-alt {
      color: #6366f1;
      text-decoration: none;
      word-break: break-all;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="main" role="presentation">
      <tr>
        <td class="content">
          <div class="logo">O</div>
          <h1>Verify your account</h1>
          <p>Hi ${name}, welcome to <strong>Obsidian Noir</strong>. To complete your registration and access your premium dashboard, please verify your email address below.</p>
          <a href="${url}" class="button" target="_blank">Verify Email Address</a>
        </td>
      </tr>
      <tr>
        <td class="divider"></td>
      </tr>
      <tr>
        <td class="footer">
          <p style="margin-bottom: 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
          <a href="${url}" class="link-alt">${url}</a>
          <p style="margin-top: 24px; font-size: 11px;">© 2026 Obsidian Noir. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
  `.trim();
};

export const getResetPasswordEmailTemplate = (url: string, name: string) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - Obsidian Noir</title>
  <style>
    body { background-color: #0a0a0b; margin: 0; padding: 0; font-family: sans-serif; }
    .main { background-color: #141416; margin: 40px auto; max-width: 500px; border-radius: 12px; border: 1px solid #27272a; }
    .content { padding: 40px; text-align: center; }
    h1 { color: #fafafa; font-size: 24px; margin: 0 0 16px; }
    p { color: #a1a1aa; font-size: 16px; line-height: 1.5; margin: 0 0 24px; }
    .button { display: inline-block; background-color: #6366f1; color: #ffffff; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <table width="100%" bgcolor="#0a0a0b" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td>
        <table class="main" align="center" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td class="content">
              <h1 style="color: #fafafa;">Reset Password</h1>
              <p>Hi ${name}, we received a request to reset your password for your Obsidian Noir account. If you didn't request this, you can safely ignore this email.</p>
              <a href="${url}" class="button">Reset Password</a>
              <p style="margin-top: 24px; font-size: 12px; color: #71717a;">This link will expire in 1 hour.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};
