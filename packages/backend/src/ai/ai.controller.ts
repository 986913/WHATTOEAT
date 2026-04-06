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

  @Sse('stream')
  stream(@Query('taskId') taskId: string): Observable<MessageEvent> {
    if (!taskId) throw new BadRequestException('taskId is required');

    const subject = new Subject<MessageEvent>();
    const done$ = new Subject<void>();

    const unsubscribe = this.redisPubSub.createSubscriber(
      `ai:task:${taskId}`,
      (message) => {
        const parsed = JSON.parse(message) as { type: string };
        subject.next({ data: message });
        if (parsed.type === 'done' || parsed.type === 'error') {
          done$.next();
          done$.complete();
          subject.complete();
        }
      },
    );

    const heartbeat$ = interval(15000).pipe(
      takeUntil(done$),
      map(() => ({ data: JSON.stringify({ type: 'heartbeat' }) })),
    );

    return new Observable<MessageEvent>((observer) => {
      const sub1 = subject.asObservable().subscribe(observer);
      const sub2 = heartbeat$.subscribe((event) => observer.next(event));
      return () => {
        sub1.unsubscribe();
        sub2.unsubscribe();
        unsubscribe();
      };
    });
  }
}
