import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { ConfigEnum } from 'src/enum/config.enum';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly configService: ConfigService) {
    const user = this.configService.get<string>(ConfigEnum.MAIL_USER);
    const pass = this.configService.get<string>(ConfigEnum.MAIL_PASS);

    if (user && pass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass },
      });
      this.logger.log('Mail service initialized with Gmail SMTP');
    } else {
      this.logger.warn(
        'Mail service not configured — reset tokens will be logged to console only',
      );
    }
  }

  async sendPasswordResetEmail(
    to: string,
    username: string,
    resetToken: string,
    frontendUrl: string,
  ) {
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    if (!this.transporter) {
      this.logger.warn(
        `📧 [DEV] Password reset email for "${username}": ${resetLink}`,
      );
      return false;
    }

    await this.transporter.sendMail({
      from: `"MealDice" <${this.configService.get<string>(ConfigEnum.MAIL_USER)}>`,
      to,
      subject: 'Reset your MealDice password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #FF6B35;">MealDice Password Reset</h2>
          <p>Hi <strong>${username}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}"
               style="background: #FF6B35; color: white; padding: 12px 32px; border-radius: 6px;
                      text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #6c757d; font-size: 13px;">This link expires in 30 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    this.logger.log(`Password reset email sent to ${to}`);
    return true;
  }
}
