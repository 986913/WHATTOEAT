import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IngredientEntity } from './entities/ingredient.entity';

@Injectable()
export class IngredientService {
  constructor(
    @InjectRepository(IngredientEntity)
    private ingredientRepo: Repository<IngredientEntity>,
  ) {}

  findAll() {
    return this.ingredientRepo.find();
  }
}
