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
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { IngredientService } from './ingredient.service';
import { CreateIngredientDTO } from './dto/create-ingredient.dto';

@Controller('ingredients')
@UseFilters(new TypeormFilter())
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
    return this.ingredientService.findAll();
  }

  @Post()
  create(@Body() dto: CreateIngredientDTO) {
    return this.ingredientService.create(dto);
  }

  @Put('/:id')
  update(@Param('id') id: number, @Body() dto: CreateIngredientDTO) {
    return this.ingredientService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: number) {
    return this.ingredientService.remove(id);
  }
}
