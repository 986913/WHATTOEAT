import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Delete,
  Param,
  Inject,
  LoggerService,
  UseFilters,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { IngredientService } from './ingredient.service';
import { CreateIngredientPipe } from './pipes/create-ingredient.pipe';
import { CreateIngredientDTO } from './dto/create-ingredient.dto';
import { UpdateIngredientDTO } from './dto/update-ingredient.dto';
import { JwtAuthenticationGuard } from 'src/guards/jwt.guard';

@Controller('ingredients')
@UseFilters(new TypeormFilter())
@UseGuards(JwtAuthenticationGuard)
export class IngredientController {
  constructor(
    private ingredientService: IngredientService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    this.logger.log('IngredientController initialized');
  }

  @Get()
  getAll() {
    // http://localhost:3001/api/v1/ingredients
    return this.ingredientService.findAll();
  }

  @Post()
  // http://localhost:3001/api/v1/ingredients
  create(@Body(CreateIngredientPipe) dto: CreateIngredientDTO) {
    return this.ingredientService.create(dto);
  }

  @Put('/:id')
  // (通过 PathPara 更新一个ingredient) -- http://localhost:3001/api/v1/ingredients/[1]
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredientDTO,
  ) {
    return this.ingredientService.update(id, dto);
  }

  @Delete(':id')
  // (通过 PathPara 删除一个ingredient) -- http://localhost:3001/api/v1/ingredients/[1]
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ingredientService.remove(id);
  }
}
