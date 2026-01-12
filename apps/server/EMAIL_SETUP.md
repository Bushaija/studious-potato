# Email Service Setup

The application supports two email services: **Resend** (recommended) and **SMTP** (Gmail, Outlook, etc.).

## Option 1: Resend (Recommended for Production)

1. Sign up at https://resend.com
2. Get your API key from the dashboard
3. Add to `.env`:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   FROM_EMAIL="Budget Management <noreply@yourdomain.com>"
   ```
4. Verify your domain in Resend dashboard

## Option 2: SMTP (Gmail, Outlook, Custom)

### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the generated password

3. Add to `.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-16-char-app-password
   FROM_EMAIL="Budget Management <your-email@gmail.com>"
   ```

### Outlook/Office 365 Setup

```env
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
FROM_EMAIL="Budget Management <your-email@outlook.com>"
```

### Custom SMTP Server

```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-password
FROM_EMAIL="Budget Management <noreply@yourdomain.com>"
```

## Testing

After configuration, restart the server and create a test user. Check the console logs:

- `[SMTP] Email sent to...` - SMTP is working
- `[Resend] Email sent to...` - Resend is working
- `[DEV MODE] Account setup link...` - No email service configured (dev mode)

## Priority

The system checks in this order:
1. **SMTP** (if `SMTP_HOST` is set)
2. **Resend** (if `RESEND_API_KEY` is set)
3. **Dev Mode** (logs links to console)

## Troubleshooting

### Gmail "Less secure app access"
- Use App Passwords instead of your regular password
- Enable 2FA first

### Port Issues
- Port 587: STARTTLS (recommended)
- Port 465: SSL/TLS (set `SMTP_SECURE=true`)
- Port 25: Usually blocked by ISPs

### Authentication Failed
- Double-check username and password
- For Gmail, use App Password, not regular password
- Check if 2FA is enabled

### Emails in Spam
- Verify your domain's SPF/DKIM records
- Use a professional email address
- Avoid spam trigger words in subject/body
