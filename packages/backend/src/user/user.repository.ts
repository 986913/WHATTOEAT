import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { GetUsersDTO } from './dto/get-users.dto';
import { UpdateUserDTO } from './dto/update-user.dto';

@Injectable()
export class UserRepository {
  private readonly repo: Repository<UserEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.repo = dataSource.getRepository(UserEntity);
  }

  findById(id: number) {
    return this.repo.findOne({ where: { id } });
  }

  findByUserName(username: string) {
    return this.repo.findOne({ where: { username } });
  }

  findUserProfile(userId: number) {
    return this.repo.findOne({
      where: {
        id: userId,
      },
      relations: {
        profile: true,
      },
    });
  }

  async findUsersWithFilters(query: GetUsersDTO) {
    const { page = 1, limit = 10, username, role, gender } = query;
    /*
      return this.userRepository.find({
        select: {
          id: true,
          username: true,
          password: false, //用来隐藏password
        },
        relations: {
          profile: true,
          roles: true,
        },
        where: {
          username,
          profile: {
            gender,
          },
          roles: {
            id: role,
          },
        },
        take: limit, // 每页多少条
        skip: (page - 1) * limit, // 跳过 前多少条(page-1)*limit 数据，用于分页
      });
    */
    const queryBuilder = this.repo
      .createQueryBuilder('usersTable')
      .leftJoinAndSelect('usersTable.profile', 'profile')
      .leftJoinAndSelect('usersTable.roles', 'roles');
    // 后面的.where会替换前面的.where, 所以要用.andWhere
    if (username) {
      queryBuilder.where('usersTable.username = :username', { username });
    }
    if (gender) {
      queryBuilder.andWhere('profile.gender = :gender', { gender });
    }
    if (role) {
      queryBuilder.andWhere('roles.id = :roleId', { roleId: role });
    }

    const [data, total] = await queryBuilder
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return { data, total };
  }

  createAndSave(user: UserEntity) {
    const newUser = this.repo.create(user);
    return this.repo.save(newUser);
  }

  deleteById(id: number) {
    return this.repo.delete(id);
  }

  deepUpdate(user: UserEntity, updateUser: UpdateUserDTO) {
    const newUser = this.repo.merge(user, updateUser);
    // 有关系的模型update, 需要使用save方法
    return this.repo.save(newUser);
  }

  /* 这个只是适合单模型的update, 不适合有关系的模型update */
  update(userId: number, user: Partial<UserEntity>) {
    return this.repo.update(userId, user);
  }
}
