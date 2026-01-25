import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { IngredientEntity } from './entities/ingredient.entity';
import { CreateIngredientDTO } from './dto/create-ingredient.dto';
import { UpdateIngredientDTO } from './dto/update-ingredient.dto';

@Injectable()
export class IngredientService {
  constructor(
    @InjectRepository(IngredientEntity)
    private ingredientRepo: Repository<IngredientEntity>,
  ) {}

  findAll() {
    return this.ingredientRepo.find();
  }

  async create(dto: CreateIngredientDTO) {
    const normalized = dto.name.trim().toLowerCase();
    const existing = await this.ingredientRepo
      .createQueryBuilder('ing')
      .where('LOWER(ing.name) = :name', { name: normalized })
      .getOne();

    if (existing) return existing;

    const ingredient = this.ingredientRepo.create({
      name: dto.name.trim(),
    });

    return this.ingredientRepo.save(ingredient);
  }

  async update(id: number, dto: UpdateIngredientDTO) {
    const ingredient = await this.ingredientRepo.findOneBy({ id });
    if (!ingredient) throw new Error('Ingredient not found');

    ingredient.name = dto.name.trim();
    return this.ingredientRepo.save(ingredient);
  }

  async remove(id: number) {
    return this.ingredientRepo.delete(id);
  }
}
