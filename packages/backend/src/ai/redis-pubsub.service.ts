import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';
import { ConfigEnum } from 'src/enum/config.enum';

@Injectable()
export class RedisPubSubService implements OnModuleDestroy {
  private pub: Redis;

  constructor(private configService: ConfigService) {
    const opts = this.buildRedisOptions();
    this.pub = new Redis(opts);
  }

  private buildRedisOptions() {
    const host = this.configService.get<string>(ConfigEnum.REDIS_HOST);
    const port = this.configService.get<number>(ConfigEnum.REDIS_PORT);
    const tls = this.configService.get<boolean>(ConfigEnum.REDIS_TLS);

    const opts: RedisOptions = { host, port };
    if (tls) opts.tls = {};
    return opts;
  }

  /**
   * Publish to pub/sub AND append to a buffer list so late subscribers can replay.
   * Buffer TTL = 10 min (same as task status).
   */
  async publish(channel: string, message: string): Promise<void> {
    const bufferKey = `${channel}:buf`;
    const parsed = JSON.parse(message) as { type: string };
    console.log(`[Redis] publish channel=${channel} type=${parsed.type}`);
    await Promise.all([
      this.pub.publish(channel, message),
      this.pub.rpush(bufferKey, message),
      this.pub.expire(bufferKey, 600),
    ]);
  }

  /**
   * Creates a dedicated ioredis connection per subscriber (one per SSE connection).
   * Replays any buffered messages first (handles race condition where backend
   * starts publishing before the SSE client connects), then listens for new ones.
   * Returns a cleanup fn to unsubscribe + disconnect when the SSE client disconnects.
   */
  createSubscriber(
    channel: string,
    onMessage: (message: string) => void,
  ): () => void {
    const bufferKey = `${channel}:buf`;
    const sub = new Redis(this.buildRedisOptions());

    // Replay buffered messages, then subscribe for live ones
    void this.pub.lrange(bufferKey, 0, -1).then((buffered) => {
      console.log(`[Redis] subscriber replay channel=${channel} buffered=${buffered.length} msgs`);
      buffered.forEach((msg) => onMessage(msg));
      void sub.subscribe(channel);
    });

    sub.on('message', (ch, msg) => {
      if (ch === channel) onMessage(msg);
    });
    return () => {
      void sub.unsubscribe(channel);
      sub.disconnect();
    };
  }

  async setTaskStatus(taskId: string, status: string): Promise<void> {
    // TTL 10 min — auto-cleanup if client never connects to SSE
    await this.pub.set(`ai:task:${taskId}:status`, status, 'EX', 600);
  }

  async getTaskStatus(taskId: string): Promise<string | null> {
    return this.pub.get(`ai:task:${taskId}:status`);
  }

  async acquireUserLock(userId: number, taskId: string): Promise<boolean> {
    const key = `ai:user:${userId}:generating`;
    // NX = only set if not exists, EX = TTL in seconds
    const result = await this.pub.set(key, taskId, 'EX', 120, 'NX');
    return result === 'OK';
  }

  async releaseUserLock(userId: number): Promise<void> {
    await this.pub.del(`ai:user:${userId}:generating`);
  }

  onModuleDestroy() {
    this.pub.disconnect();
  }
}
