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
  ParseIntPipe,
  UseGuards,
  Req,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  WeeklyCommitDTO,
  WeeklyPreviewDTO,
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

  // http://localhost:3001/api/v1/plans/me
  @Get('me')
  getMyPlans(@Req() req: AuthRequest) {
    const userId = req.user.userID; // JwtAuthenticationGuard 负责认证并将用户信息附加到 req.user
    return this.planService.findByUser(userId);
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
