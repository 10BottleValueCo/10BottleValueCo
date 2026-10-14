# Email code after password

Changes are staged in Replit, not published.

1. In Supabase **SQL Editor**, run the complete file
   `supabase/migrations/20261014020000_email_login_mfa.sql`.
   It does not rename users, emails, orders or invoices. It adds private
   verification storage and access checks that take effect only after a user
   confirms activation. Any previous Data API pre-request hook is preserved.
2. In **Authentication → MFA**, leave the **TOTP/App Authenticator** provider
   enabled. The server uses a private native factor so Supabase itself issues
   verified (`aal2`) sessions; the customer never needs an authenticator app.
3. In **Authentication → Email Templates → Magic Link**, include the email code:

   ```html
   <h2>10BottleValueCo — Verification code</h2>
   <p>Your verification code:</p>
   <p style="font-size:28px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
   <p>Enter this code on the website within 10 minutes. Never share it.</p>
   <p>If you did not request this code, ignore this email.</p>
   ```

   The code uses Supabase's existing SMTP setup. Do not replace the signup or
   password-recovery templates. No additional mail API key is required.
   Keep the Email provider's OTP length at **6 digits**.
4. Once setup is confirmed, open **Account → Security → Email code at sign-in**.
   Enabling requires a code sent to the current verified mailbox. Disabling
   from an already verified password + second-factor session does not send
   another code; a password-only session still cannot disable protection.
   An unsuccessful send/incorrect code never enables protection.
5. Each fresh password sign-in then asks for an email code. Ordinary reloads of
   an already verified session do not send another code.

Keep access to the current mailbox. Do not enable this if you cannot receive its
emails. Emergency recovery of a lost mailbox requires administrator assistance;
there is intentionally no password-only fallback.

Do not publish until the SQL and email template are configured. Test with a
non-administrator account first. Never test with real payments or delete user
history to troubleshoot sign-in.
