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
  Query,
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  WeeklyCommitDTO,
  WeeklyPreviewDTO,
  ReplaceMealDTO,
} from './dto/create-weekly-plan.dto';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { PlanService } from './plan.service';
import { AuthRequest } from 'src/guards/admin.guard';
import { CreatePlanDTO } from './dto/create-plan.dto';
import { JwtAuthenticationGuard } from 'src/guards/jwt.guard';
import { AdminGuard } from 'src/guards/admin.guard';

@Controller('plans')
@UseFilters(new TypeormFilter())
@UseGuards(JwtAuthenticationGuard)
@UseInterceptors(ClassSerializerInterceptor)
export class PlanController {
  constructor(
    private planService: PlanService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.logger.log('PlanController initialized');
  }

  // http://localhost:3001/api/v1/plans
  @Get()
  @UseGuards(AdminGuard)
  getPlans(): any {
    this.logger.log('get all plans');
    return this.planService.findAll();
  }

  // http://localhost:3001/api/v1/plans
  @Get('byUser')
  @UseGuards(AdminGuard)
  getPlansGroupedByUser() {
    return this.planService.findAllGroupedByUser();
  }

  // http://localhost:3001/api/v1/plans/me?from=2026-03-13&to=2026-03-13&sort=ASC
  @Get('me')
  getMyPlans(
    @Req() req: AuthRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('sort') sort?: 'ASC' | 'DESC',
  ) {
    const userId = req.user.userID;
    return this.planService.findByUser(userId, from, to, sort);
  }

  // http://localhost:3001/api/v1/plans
  @Post()
  addPlan(@Body() dto: CreatePlanDTO): any {
    this.logger.log('Adding a new plan');
    return this.planService.create(dto);
  }

  // http://localhost:3001/api/v1/plans/weekly-preview   → (Draft Only) 返回 draft weekly plans
  @Post('weekly-preview')
  previewWeeklyPlan(@Body() dto: WeeklyPreviewDTO, @Req() req: AuthRequest) {
    return this.planService.generateWeeklyPreview(
      req.user.userID ?? dto.userId,
      dto.startDate,
    );
  }

  // http://localhost:3001/api/v1/plans/replace-meal   → 随机换一个同类型的 meal（不写库）
  @Post('replace-meal')
  replaceMeal(@Body() dto: ReplaceMealDTO) {
    return this.planService.getRandomReplacementMeal(
      dto.typeId,
      dto.excludeMealId,
    );
  }

  // http://localhost:3001/api/v1/plans/weekly-commit   → (Bulk Insert) 批量写入数据库
  @Post('weekly-commit')
  commitWeeklyPlan(@Body() dto: WeeklyCommitDTO, @Req() req: AuthRequest) {
    return this.planService.commitWeeklyPlans(req.user.userID, dto);
  }

  // (通过 PathPara 删除一个plan) -- http://localhost:3001/api/v1/plans/[1]
  @Delete('/:id')
  deletePlan(@Param('id', ParseIntPipe) planId: number): any {
    this.logger.log(`Deleting plan with ID: ${planId}`);
    return this.planService.remove(planId);
  }
}
