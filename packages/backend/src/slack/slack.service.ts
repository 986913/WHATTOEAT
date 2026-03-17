import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigEnum } from 'src/enum/config.enum';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly webhookUrl: string | undefined;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>(ConfigEnum.SLACK_WEBHOOK_URL);
    if (url) {
      this.webhookUrl = url;
      this.logger.log('Slack webhook configured');
    } else {
      this.logger.warn(
        'Slack webhook not configured — notifications will be logged to console only',
      );
    }
  }

  /**
   * Fire-and-forget 发送 Slack 通知
   * 不 await，不影响主流程
   */
  notify(text: string): void {
    if (!this.webhookUrl) {
      this.logger.debug(`[Slack skip] ${text}`);
      return;
    }

    fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }).catch((err) => {
      this.logger.error(`Slack notification failed: ${err}`);
    });
  }
}
