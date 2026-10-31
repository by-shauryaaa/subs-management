import { Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { loadEnvironment } from '../../config/environment.js';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly mailFrom: string;

  constructor() {
    const env = loadEnvironment();
    this.mailFrom = env.MAIL_FROM;

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER.length > 0
          ? {
              user: env.SMTP_USER,
              pass: env.SMTP_PASS,
            }
          : undefined,
    });
  }

  /**
   * Generic mail sender method.
   */
  async sendMail(options: SendMailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.mailFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      });
      this.logger.log(`Email sent to ${options.to}: "${options.subject}"`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      throw error;
    }
  }

  /**
   * Send password reset email with token link.
   */
  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const subject = 'Reset your password — Brightloop';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F766E;">Password Reset Request</h2>
        <p>You requested a password reset for your Brightloop account.</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #0F766E; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
        </p>
        <p style="color: #5A6B65; font-size: 14px;">This link is valid for 30 minutes and can only be used once.</p>
        <p style="color: #8A9993; font-size: 12px;">If you did not request this, you can safely ignore this email.</p>
      </div>
    `;
    await this.sendMail({ to, subject, html });
  }

  /**
   * Send account invite email to staff or customer.
   */
  async sendInvite(
    to: string,
    inviteUrl: string,
    recipientName: string,
  ): Promise<void> {
    const subject = 'Welcome to Brightloop — Complete your registration';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F766E;">Welcome to Brightloop</h2>
        <p>Hello ${recipientName},</p>
        <p>You have been invited to access the Brightloop platform. Please click below to set up your password and access your account:</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="background-color: #0F766E; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Set Up Your Account
          </a>
        </p>
        <p style="color: #5A6B65; font-size: 14px;">This invitation link will expire in 72 hours.</p>
      </div>
    `;
    await this.sendMail({ to, subject, html });
  }

  /**
   * Send quotation link to customer for review and acceptance.
   */
  async sendQuotation(
    to: string,
    quotationUrl: string,
    subNumber: string,
  ): Promise<void> {
    const subject = `Quotation ${subNumber} ready for review — Brightloop`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F766E;">Your Subscription Quotation is Ready</h2>
        <p>Quotation <strong>${subNumber}</strong> is ready for your review.</p>
        <p style="margin: 24px 0;">
          <a href="${quotationUrl}" style="background-color: #0F766E; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Review and Accept Quotation
          </a>
        </p>
      </div>
    `;
    await this.sendMail({ to, subject, html });
  }

  /**
   * Send invoice notification with optional PDF attachment.
   */
  async sendInvoice(
    to: string,
    invoiceNumber: string,
    pdfBuffer?: Buffer,
  ): Promise<void> {
    const subject = `Invoice ${invoiceNumber} from Brightloop`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #0F766E;">Invoice ${invoiceNumber}</h2>
        <p>Please find attached your invoice <strong>${invoiceNumber}</strong>.</p>
        <p>Thank you for your business!</p>
      </div>
    `;
    await this.sendMail({
      to,
      subject,
      html,
      attachments: pdfBuffer
        ? [
            {
              filename: `${invoiceNumber.replace('/', '-')}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    });
  }
}
