/**
 * Database seed script — run via: npx ts-node -r tsconfig-paths/register src/seeds/seed.ts
 *
 * Idempotent: safe to run multiple times (uses upsert / find-or-create).
 * Creates: roles, types, ingredients, a test user (with admin role), and sample meals.
 */
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { UserEntity } from '../user/entities/user.entity';
import { ProfileEntity } from '../user/entities/profile.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { TypeEntity, MealType } from '../type/entities/type.entity';
import { IngredientEntity } from '../ingredient/entities/ingredient.entity';
import { MealEntity } from '../meal/entities/meal.entity';
import { PlanEntity } from '../plan/entities/plan.entity';
import { LogEntity } from '../log/entities/log.entity';

// ── DataSource (mirrors app.module.ts for local dev) ──────────
const AppDataSource = new DataSource({
  type: 'mysql',
  host: '127.0.0.1',
  port: 3307,
  username: 'root',
  password: 'rootpass',
  database: 'testdb',
  synchronize: true,
  entities: [
    UserEntity,
    ProfileEntity,
    RoleEntity,
    TypeEntity,
    IngredientEntity,
    MealEntity,
    PlanEntity,
    LogEntity,
  ],
});

// ── Seed Data ─────────────────────────────────────────────────
const ROLES = ['admin', 'write', 'readonly'];

const TYPES = [
  MealType.BREAKFAST,
  MealType.LUNCH,
  MealType.DINNER,
  MealType.SNACK,
];

const INGREDIENTS = [
  'Rice',
  'Noodles',
  'Bread',
  'Egg',
  'Chicken',
  'Beef',
  'Pork',
  'Salmon',
  'Shrimp',
  'Tofu',
  'Tomato',
  'Potato',
  'Broccoli',
  'Spinach',
  'Carrot',
  'Onion',
  'Garlic',
  'Mushroom',
  'Avocado',
  'Cheese',
  'Milk',
  'Butter',
  'Oats',
  'Lettuce',
  'Corn',
  'Bell Pepper',
  'Soy Sauce',
  'Olive Oil',
];

// Each meal: [name, videoUrl, imageUrl, types[], ingredientNames[]]
const MEALS: [string, string, string, MealType[], string[]][] = [
  // ── Breakfast ──
  [
    'Scrambled Eggs on Toast',
    'https://youtube.com/watch?v=example1',
    'https://images.unsplash.com/photo-1525351484163-7529414344d8',
    [MealType.BREAKFAST],
    ['Egg', 'Bread', 'Butter'],
  ],
  [
    'Oatmeal with Avocado',
    'https://youtube.com/watch?v=example2',
    'https://images.unsplash.com/photo-1517673400267-0251440c45dc',
    [MealType.BREAKFAST],
    ['Oats', 'Avocado', 'Milk'],
  ],
  [
    'Egg Fried Rice',
    'https://youtube.com/watch?v=example3',
    'https://images.unsplash.com/photo-1603133872878-684f208fb84b',
    [MealType.BREAKFAST, MealType.LUNCH],
    ['Rice', 'Egg', 'Soy Sauce', 'Onion', 'Garlic'],
  ],
  // ── Lunch ──
  [
    'Chicken Salad',
    'https://youtube.com/watch?v=example4',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
    [MealType.LUNCH],
    ['Chicken', 'Lettuce', 'Tomato', 'Avocado', 'Olive Oil'],
  ],
  [
    'Beef Noodle Soup',
    'https://youtube.com/watch?v=example5',
    'https://images.unsplash.com/photo-1569718212165-3a8278d5f624',
    [MealType.LUNCH, MealType.DINNER],
    ['Beef', 'Noodles', 'Onion', 'Garlic', 'Soy Sauce'],
  ],
  [
    'Shrimp Tacos',
    'https://youtube.com/watch?v=example6',
    'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b',
    [MealType.LUNCH],
    ['Shrimp', 'Lettuce', 'Tomato', 'Avocado', 'Onion'],
  ],
  // ── Dinner ──
  [
    'Salmon with Broccoli',
    'https://youtube.com/watch?v=example7',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    [MealType.DINNER],
    ['Salmon', 'Broccoli', 'Garlic', 'Olive Oil', 'Butter'],
  ],
  [
    'Pork Stir Fry',
    'https://youtube.com/watch?v=example8',
    'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd',
    [MealType.DINNER],
    ['Pork', 'Bell Pepper', 'Onion', 'Garlic', 'Soy Sauce', 'Rice'],
  ],
  [
    'Chicken Curry with Rice',
    'https://youtube.com/watch?v=example9',
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe',
    [MealType.DINNER],
    ['Chicken', 'Rice', 'Potato', 'Onion', 'Garlic', 'Tomato'],
  ],
  [
    'Mushroom Risotto',
    'https://youtube.com/watch?v=example10',
    'https://images.unsplash.com/photo-1476124369491-e7addf5db371',
    [MealType.DINNER, MealType.LUNCH],
    ['Rice', 'Mushroom', 'Onion', 'Garlic', 'Butter', 'Cheese'],
  ],
  // ── Snack ──
  [
    'Avocado Toast',
    'https://youtube.com/watch?v=example11',
    'https://images.unsplash.com/photo-1541519227354-08fa5d50c44d',
    [MealType.SNACK, MealType.BREAKFAST],
    ['Bread', 'Avocado', 'Egg'],
  ],
  [
    'Corn on the Cob',
    'https://youtube.com/watch?v=example12',
    'https://images.unsplash.com/photo-1551754655-cd27e38d2076',
    [MealType.SNACK],
    ['Corn', 'Butter'],
  ],
];

// ── Main ──────────────────────────────────────────────────────
async function seed() {
  await AppDataSource.initialize();
  console.log('🔗 Seed: Connected to database');

  const roleRepo = AppDataSource.getRepository(RoleEntity);
  const typeRepo = AppDataSource.getRepository(TypeEntity);
  const ingredientRepo = AppDataSource.getRepository(IngredientEntity);
  const mealRepo = AppDataSource.getRepository(MealEntity);
  const userRepo = AppDataSource.getRepository(UserEntity);
  const profileRepo = AppDataSource.getRepository(ProfileEntity);

  // 1. Roles
  for (const name of ROLES) {
    const exists = await roleRepo.findOne({ where: { roleName: name } });
    if (!exists) {
      await roleRepo.save(roleRepo.create({ roleName: name }));
      console.log(`  ✅ Role: ${name}`);
    }
  }

  // 2. Types
  for (const name of TYPES) {
    const exists = await typeRepo.findOne({ where: { name } });
    if (!exists) {
      await typeRepo.save(typeRepo.create({ name }));
      console.log(`  ✅ Type: ${name}`);
    }
  }

  // 3. Ingredients
  for (const name of INGREDIENTS) {
    const exists = await ingredientRepo.findOne({ where: { name } });
    if (!exists) {
      await ingredientRepo.save(ingredientRepo.create({ name }));
      console.log(`  ✅ Ingredient: ${name}`);
    }
  }

  // 4. Test user (admin)
  const adminRole = await roleRepo.findOne({ where: { roleName: 'admin' } });
  let testUser = await userRepo.findOne({
    where: { username: 'ming' },
    relations: { roles: true },
  });
  if (!testUser) {
    testUser = userRepo.create({
      username: 'ming',
      password: await argon2.hash('123'),
      email: 'ming@test.com',
    });
    testUser.roles = adminRole ? [adminRole] : [];
    testUser = await userRepo.save(testUser);

    const profile = profileRepo.create({ user: testUser });
    await profileRepo.save(profile);
    console.log('  ✅ User: ming (admin)');
  }

  // 5. Meals
  const allTypes = await typeRepo.find();
  const allIngredients = await ingredientRepo.find();
  const typeMap = new Map(allTypes.map((t) => [t.name, t]));
  const ingredientMap = new Map(allIngredients.map((i) => [i.name, i]));

  for (const [name, videoUrl, imageUrl, types, ingredientNames] of MEALS) {
    const exists = await mealRepo.findOne({ where: { name } });
    if (exists) continue;

    const meal = mealRepo.create({
      name,
      videoUrl,
      imageUrl,
      types: types.map((t) => typeMap.get(t)!).filter(Boolean),
      ingredients: ingredientNames
        .map((n) => ingredientMap.get(n)!)
        .filter(Boolean),
    });
    await mealRepo.save(meal);
    console.log(`  ✅ Meal: ${name}`);
  }

  console.log('\n🎉 Seed complete!');
  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
