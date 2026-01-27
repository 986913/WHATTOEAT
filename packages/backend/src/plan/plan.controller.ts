import {
  Controller,
  Inject,
  LoggerService,
  UseFilters,
  Body,
  Post,
  Get,
  Delete,
  Param,
} from '@nestjs/common';
import {
  WeeklyCommitDTO,
  WeeklyPreviewDTO,
} from './dto/create-weekly-plan.dto';
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

  @Get()
  // http://localhost:3001/api/v1/plans
  getPlans(): any {
    this.logger.log('get all plans');
    return this.planService.findAll();
  }

  @Post()
  // http://localhost:3001/api/v1/plans
  addPlan(@Body() dto: CreatePlanDTO): any {
    this.logger.log('Adding a new plan');
    return this.planService.create(dto);
  }

  // http://localhost:3001/api/v1/plans/weekly-preview   → (Draft Only) 返回 draft weekly plans
  @Post('weekly-preview')
  previewWeeklyPlan(@Body() dto: WeeklyPreviewDTO) {
    return this.planService.generateWeeklyPreview(dto.userId ?? 1);
  }

  // http://localhost:3001/api/v1/plans/weekly-commit   → (Bulk Insert) 批量写入数据库
  @Post('weekly-commit')
  commitWeeklyPlan(@Body() dto: WeeklyCommitDTO) {
    return this.planService.commitWeeklyPlans(dto);
  }

  @Delete('/:id')
  // (通过 PathPara 删除一个plan) -- http://localhost:3001/api/v1/plans/[1]
  deleteUser(@Param('id') planId: number): any {
    this.logger.log(`Deleting plan with ID: ${planId}`);
    return this.planService.remove(planId);
  }
}
