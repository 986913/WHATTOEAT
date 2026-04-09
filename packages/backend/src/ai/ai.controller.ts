import {
  Controller,
  Post,
  Body,
  Query,
  Sse,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { Observable, Subject, interval } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { JwtAuthenticationGuard } from 'src/guards/jwt.guard';
import { AiService } from './ai.service';
import { RedisPubSubService } from './redis-pubsub.service';
import { AuthRequest } from 'src/guards/admin.guard';

interface MessageEvent {
  data: string;
}

@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private redisPubSub: RedisPubSubService,
  ) {}

  // JWT 验证通过后，触发后台生成任务，立即返回 taskId（不等 AI 完成）
  // 前端拿到 taskId 后，再用 GET /ai/stream 建 SSE 连接订阅结果
  @Post('generate')
  @UseGuards(JwtAuthenticationGuard)
  async generate(
    @Body() body: { preference: string; startDate?: string },
    @Req() req: AuthRequest,
  ) {
    const userId: number = req.user.userID;
    const taskId = await this.aiService.startGeneration(
      userId,
      body.preference,
      body.startDate,
    );
    return { taskId };
  }

  // @Sse 告诉 NestJS 这个接口是 SSE 长连接
  // 只要返回 Observable，框架自动帮你把每次 observer.next() 转成 data: ...\n\n 格式推给浏览器
  // 不需要手写任何 res.write() 或 res.flush()
  @Sse('stream')
  stream(@Query('taskId') taskId: string): Observable<MessageEvent> {
    if (!taskId) throw new BadRequestException('taskId is required');

    // subject 是 Redis → SSE 的转换桥：
    // Redis 那边是回调风格（有消息了我通知你），SSE 这边要的是 Observable 风格
    // subject 同时是 Observer（能 .next() 推值）和 Observable（能 .subscribe() 消费）
    const subject = new Subject<MessageEvent>();

    // done$ 是信号弹：AI 任务结束（done/error）时触发，用来取消心跳
    const done$ = new Subject<void>();

    // createSubscriber 是封装：内部建了一个专用 Redis 连接，执行 SUBSCRIBE，注册回调
    // 在 Controller 这里调用它，就等于订阅了这个 taskId 的 Redis channel
    const unsubscribe = this.redisPubSub.createSubscriber(
      `ai:task:${taskId}`,
      (message) => {
        const parsed = JSON.parse(message) as { type: string };
        // Redis 推来消息 → 塞进 subject → SSE 帧推给浏览器（前端拿到后自己 JSON.parse）
        subject.next({ data: message });
        if (parsed.type === 'done' || parsed.type === 'error') {
          done$.next(); // 告知心跳：可以停了
          done$.complete();
          subject.complete(); // subject 结束 → Observable 结束 → NestJS 关闭 SSE 连接
        }
      },
    );

    // 每 15s 发一次心跳，防止 Nginx/ALB 因为长时间没有数据把连接掐掉
    // takeUntil(done$)：任务结束时自动停止，不泄漏
    const heartbeat$ = interval(15000).pipe(
      takeUntil(done$),
      map(() => ({ data: JSON.stringify({ type: 'heartbeat' }) })),
    );

    return new Observable<MessageEvent>((observer) => {
      const sub1 = subject.asObservable().subscribe(observer); // AI 消息流
      const sub2 = heartbeat$.subscribe((event) => observer.next(event)); // 心跳流

      // teardown：浏览器断开连接时 NestJS 自动调用这里
      // 清理 Redis subscriber 连接，防止连接泄漏
      return () => {
        sub1.unsubscribe();
        sub2.unsubscribe();
        unsubscribe(); // 断开 Redis 那边的 sub 连接
      };
    });
  }
}
