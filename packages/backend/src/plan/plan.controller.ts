import {
  Controller,
  Inject,
  LoggerService,
  UseFilters,
  Body,
  Post,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { PlanService } from './plan.service';
import { CreatePlanDTO } from './dto/create-plan.dto';

@Controller('plans')
@UseFilters(new TypeormFilter())
export class PlanController {
  constructor(
    private planService: PlanService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.logger.log('PlanController initialized');
  }

  @Post()
  // http://localhost:3001/api/v1/plans
  addPlan(@Body() dto: CreatePlanDTO): any {
    this.logger.log('Adding a new plan');
    return this.planService.create(dto);
  }
}
