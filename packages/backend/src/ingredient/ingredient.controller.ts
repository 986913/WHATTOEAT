import {
  Controller,
  Get,
  Inject,
  LoggerService,
  UseFilters,
} from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { TypeormFilter } from 'src/filters/typeorm.filter';
import { IngredientService } from './ingredient.service';

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
}
