import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey = process.env.BREVO_API_KEY || '';
  private readonly senderEmail = process.env.BREVO_SENDER_EMAIL || 'rahulramesharani@gmail.com';
  private readonly senderName = process.env.BREVO_SENDER_NAME || 'UYRA Emergency Platform';

  /**
   * Send 6-digit OTP email via Brevo REST API
   */
  async sendOtpEmail(toEmail: string, otp: string, purpose: 'SIGNUP' | 'FORGOT_PASSWORD'): Promise<boolean> {
    const isSignup = purpose === 'SIGNUP';
    const subject = isSignup
      ? 'UYRA SOS — Verify Your Citizen Account'
      : 'UYRA SOS — Password Reset Verification Code';

    const actionText = isSignup
      ? 'Thank you for signing up to the UYRA Public Emergency Response Platform. Please verify your email address to activate your account.'
      : 'We received a request to reset your password. Use the verification code below to set a new password.';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 24px;">
          <div style="max-width: 520px; margin: 0 auto; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #DC2626; margin: 0; font-size: 28px; font-weight: 900; letter-spacing: -0.5px;">UYRA <span style="font-size: 14px; background: #DC2626; color: white; padding: 2px 8px; border-radius: 999px; vertical-align: middle;">SOS</span></h1>
              <p style="color: #64748B; font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-top: 4px;">Every Life. Every Second.</p>
            </div>
            <p style="color: #334155; font-size: 15px; line-height: 1.5; margin-bottom: 24px;">${actionText}</p>
            <div style="background-color: #F1F5F9; border-radius: 8px; padding: 16px; text-align: center; margin: 24px 0; border: 1px dashed #CBD5E1;">
              <span style="font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase; display: block; margin-bottom: 4px;">Your 6-Digit Verification Code</span>
              <span style="font-family: monospace; font-size: 36px; font-weight: 800; color: #0F172A; letter-spacing: 8px;">${otp}</span>
            </div>
            <p style="color: #64748B; font-size: 13px; line-height: 1.5;">This code will expire in <strong>10 minutes</strong>. If you did not request this verification, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 11px; text-align: center; margin: 0;">UYRA Emergency Response System • For urgent immediate dispatch, call 112.</p>
          </div>
        </body>
      </html>
    `;

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: toEmail }],
          subject,
          htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Failed to send email via Brevo: ${response.status} ${errorText}`);
        return false;
      }

      this.logger.log(`Successfully dispatched Brevo OTP email to ${toEmail}`);
      return true;
    } catch (err) {
      this.logger.error(`Error sending Brevo OTP email: ${err.message}`, err.stack);
      return false;
    }
  }
}
