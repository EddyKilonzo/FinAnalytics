import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { renderFile } from 'ejs';
import { join } from 'path';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly transporter: nodemailer.Transporter | null;
  private readonly from: string;
  private readonly templatesDir = join(__dirname, 'templates');

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');
    const port = Number(this.config.get<string>('MAIL_PORT') ?? 587);
    const secure = this.config.get<string>('MAIL_SECURE') === 'true';
    const forceIpv4 = this.config.get<string>('MAIL_FORCE_IPV4', 'true') === 'true';
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASSWORD');
    this.from = this.config.get<string>('MAIL_FROM') ?? 'FinAnalytics <no-reply@finanalytics.app>';

    if (!host || !user || !pass) {
      this.logger.warn(
        'Mailer is disabled. Missing one of MAIL_HOST, MAIL_USER, MAIL_PASSWORD.',
      );
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      // Some networks on Windows cannot reach Gmail SMTP over IPv6.
      // Force IPv4 to avoid ENETUNREACH errors like:
      // connect ENETUNREACH 2a00:1450:...:587
      ...(forceIpv4 ? { family: 4 as const } : {}),
      // Keep auth endpoints responsive even if SMTP is slow/unreachable.
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
  }

  /**
   * Generic mail sender used by higher-level helper methods.
   * This method intentionally never throws to avoid breaking
   * core product flows because of email transport issues.
   */
  async sendMail(input: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      await this.transporter.sendMail({
        from: this.from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `Could not send email to ${input.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return false;
    }
  }

  private async renderTemplate(
    templateName: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    const templatePath = join(this.templatesDir, `${templateName}.ejs`);
    return renderFile(templatePath, data);
  }

  async sendProfilePictureUpdatedEmail(params: {
    to: string;
    name?: string | null;
    avatarUrl: string;
  }): Promise<void> {
    const displayName = params.name?.trim() || 'there';
    try {
      const html = await this.renderTemplate('profile-picture-updated', {
        name: displayName,
        avatarUrl: params.avatarUrl,
      });
      await this.sendMail({
        to: params.to,
        subject: 'Your FinAnalytics profile picture was updated',
        html,
        text: `Hi ${displayName}, your profile picture was updated. If this wasn't you, secure your account immediately.`,
      });
    } catch (error) {
      this.logger.warn(
        `Could not render/send profile picture email to ${params.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async sendWelcomeEmail(params: {
    to: string;
    name?: string | null;
  }): Promise<void> {
    const displayName = params.name?.trim() || 'there';
    try {
      const html = await this.renderTemplate('welcome', { name: displayName });
      await this.sendMail({
        to: params.to,
        subject: 'Welcome to FinAnalytics',
        html,
        text: `Hi ${displayName}, welcome to FinAnalytics! Your account is ready.`,
      });
    } catch (error) {
      this.logger.warn(
        `Could not render/send welcome email to ${params.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async sendEmailVerificationEmail(params: {
    to: string;
    name?: string | null;
    verificationLink: string;
    verificationCode: string;
  }): Promise<void> {
    const displayName = params.name?.trim() || 'there';
    try {
      const html = await this.renderTemplate('verify-email', {
        name: displayName,
        verificationLink: params.verificationLink,
        verificationCode: params.verificationCode,
      });
      await this.sendMail({
        to: params.to,
        subject: 'Verify your FinAnalytics email',
        html,
        text: `Hi ${displayName}, verify your email: ${params.verificationLink}. Your 6-digit code is ${params.verificationCode} (expires in 24 hours).`,
      });
    } catch (error) {
      this.logger.warn(
        `Could not render/send verification email to ${params.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async sendRoleChangedEmail(params: {
    to: string;
    name?: string | null;
    newRole: 'USER' | 'ADMIN';
  }): Promise<void> {
    const displayName = params.name?.trim() || 'there';
    try {
      const html = await this.renderTemplate('role-changed', {
        name: displayName,
        newRole: params.newRole,
      });
      await this.sendMail({
        to: params.to,
        subject: 'Your FinAnalytics role has changed',
        html,
        text: `Hi ${displayName}, your account role was changed to ${params.newRole}.`,
      });
    } catch (error) {
      this.logger.warn(
        `Could not render/send role-changed email to ${params.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async sendAccountDeletedEmail(params: {
    to: string;
    name?: string | null;
  }): Promise<void> {
    const displayName = params.name?.trim() || 'there';
    try {
      const html = await this.renderTemplate('account-deleted', {
        name: displayName,
      });
      await this.sendMail({
        to: params.to,
        subject: 'Your FinAnalytics account was deleted',
        html,
        text: `Hi ${displayName}, your FinAnalytics account was deleted.`,
      });
    } catch (error) {
      this.logger.warn(
        `Could not render/send account-deleted email to ${params.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
