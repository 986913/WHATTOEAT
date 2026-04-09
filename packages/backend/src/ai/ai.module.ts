import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { RedisPubSubService } from './redis-pubsub.service';
import { PlanModule } from 'src/plan/plan.module';

@Module({
  imports: [PlanModule],
  controllers: [AiController],
  providers: [AiService, RedisPubSubService],
})
export class AiModule {}
