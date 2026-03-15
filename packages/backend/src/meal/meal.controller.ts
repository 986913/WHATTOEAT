import {
  Controller,
  Get,
  Param,
  Inject,
  LoggerService,
  UseFilters,
  Query,
  Body,
  Post,
  Delete,
  Put,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { MealService } from './meal.service';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { GetMealsDTO } from './dto/get-meals.dto';
import { CreateMealDTO } from './dto/create-meal.dto';
import { UpdateMealDTO } from './dto/update-meal.dto';
import { JwtAuthenticationGuard } from 'src/guards/jwt.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { AuthRequest } from 'src/guards/admin.guard';

// ================================
// User-facing meal endpoints (no AdminGuard)
// ================================
@Controller('meals/me')
@UseFilters(new TypeormFilter())
@UseGuards(JwtAuthenticationGuard)
export class UserMealController {
  constructor(
    private mealService: MealService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {}

  @Get()
  getMyMeals(@Req() req: AuthRequest, @Query() query: GetMealsDTO) {
    return this.mealService.findMyMeals(req.user.userID, query);
  }

  @Post()
  createMyMeal(@Req() req: AuthRequest, @Body() dto: CreateMealDTO) {
    return this.mealService.createUserMeal(req.user.userID, dto);
  }

  @Put('/:id')
  updateMyMeal(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMealDTO,
  ) {
    return this.mealService.updateUserMeal(req.user.userID, id, dto);
  }

  @Delete('/:id')
  deleteMyMeal(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    return this.mealService.removeUserMeal(req.user.userID, id);
  }
}

// ================================
// Admin meal endpoints
// ================================
@Controller('meals')
@UseFilters(new TypeormFilter())
@UseGuards(JwtAuthenticationGuard, AdminGuard)
export class MealController {
  constructor(
    private mealService: MealService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.logger.log('MealController initialized');
  }

  @Get()
  // (通过 QueryPara 获取符合条件的meals) -- http://localhost:3001/api/v1/meals?page=[1]&limit=[10]&type=[snack]
  getMeals(@Query() query: GetMealsDTO): any {
    this.logger.log('Fetching all matching meals');
    return this.mealService.findAllMatch(query);
  }

  @Get('options')
  // (通过 QueryPara 获取typeId符合条件的meals) -- http://localhost:3001/api/v1/meals/options?typeId=2
  async getMealswithCertainType(@Query('typeId', ParseIntPipe) typeId: number) {
    this.logger.log(`Fetching all meals with type id as ${typeId}`);
    return this.mealService.findOptionsByType(typeId);
  }

  @Post()
  // http://localhost:3001/api/v1/meals
  addMeal(@Body() dto: CreateMealDTO): any {
    this.logger.log('Adding a new meal');
    return this.mealService.create(dto);
  }

  @Get('/:id')
  // (通过 PathPara 获取一个meal) --  http://localhost:3001/api/v1/meals/[1]
  getMeal(@Param('id', ParseIntPipe) mealId: number): any {
    this.logger.log(`Fetching single meal, id is ${mealId}`);
    return this.mealService.findById(mealId);
  }

  @Put('/:id')
  // (通过 PathPara 更新一个meal) -- http://localhost:3001/api/v1/meals/[1]
  updateMeal(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMealDTO,
  ) {
    return this.mealService.update(id, dto);
  }

  @Delete('/:id')
  // (通过 PathPara 删除一个meal) -- http://localhost:3001/api/v1/meals/[1]
  deleteMeal(@Param('id', ParseIntPipe) mealId: number): any {
    this.logger.log(`Deleting meal with ID: ${mealId}`);
    return this.mealService.remove(mealId);
  }
}
