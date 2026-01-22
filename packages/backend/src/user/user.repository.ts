import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from 'src/role/entities/role.entity';
import { ProfileEntity } from './entities/profile.entity';
import { GetUsersDTO } from './dto/get-users.dto';
import { UpdateUserDTO } from './dto/update-user.dto';
import { NotFoundException } from '@nestjs/common';
import { CreateUserDTO } from './dto/create-user.dto';

@Injectable()
export class UserRepository {
  private readonly userRepo: Repository<UserEntity>;
  private readonly roleRepo: Repository<RoleEntity>;
  private readonly profileRepo: Repository<ProfileEntity>;

  constructor(private readonly dataSource: DataSource) {
    this.userRepo = dataSource.getRepository(UserEntity);
    this.roleRepo = dataSource.getRepository(RoleEntity);
    this.profileRepo = dataSource.getRepository(ProfileEntity);
  }

  findById(userId: number) {
    return this.userRepo.findOne({
      where: { id: userId },
      // relations: {
      //   roles: true,
      //   profile: true,
      // },
    });
  }

  findByUserName(username: string) {
    return this.userRepo.findOne({ where: { username } });
  }

  findUserProfile(userId: number) {
    return this.userRepo.findOne({
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
    const queryBuilder = this.userRepo
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

  async createAndSave(user: CreateUserDTO) {
    const { username, password, profile, roles = [] } = user;

    // 1️⃣ 处理 roles（'2' | '3' -> RoleEntity[]
    let roleEntities: RoleEntity[] = [];
    if (roles && roles.length > 0) {
      const roleIds = roles.map((id) => Number(id));
      roleEntities = await this.roleRepo.findByIds(roleIds);
    }

    // 2️⃣ create user（注意：这里只是 create，不落库）
    const newUser = this.userRepo.create({
      username,
      password,
      roles: roleEntities,
      profile: profile ? this.profileRepo.create(profile) : undefined,
    });

    /**
     * 3️⃣ save user
     * - user 先 insert
     * - profile 因为 cascade: true 自动 insert
     * - profiles.user_id 自动填
     * - users_roles 自动维护
     */
    return await this.userRepo.save(newUser);
  }

  async removeUser(user: UserEntity) {
    // 先删除关联的profile记录
    await this.userRepo
      .createQueryBuilder()
      .delete()
      .from('profiles')
      .where('user_id = :userId', { userId: user.id })
      .execute();

    // 使用 remove 方法（而不是 delete）以触发 TypeORM 的级联逻辑
    return this.userRepo.remove(user);
  }

  /**
   * 更新user，包括 profile 和 roles
   */
  async deepUpdate(user: UserEntity, updateUser: UpdateUserDTO) {
    // 更新 username
    if (updateUser.username) user.username = updateUser.username;

    // 更新 profile
    if (updateUser.profile) {
      const profileRepo = this.profileRepo;

      if (!user.profile) {
        // 用户原来没有 profile，新建一个
        const newProfile = profileRepo.create({
          ...updateUser.profile,
          user: user, // ⭐ 需要反向关联
        });
        // 先保存 profile，确保外键 userId 生效
        user.profile = await profileRepo.save(newProfile);
      } else {
        // 用户已有 profile，更新字段 （不需要重新设置 user，因为它已经在数据库里正确关联）
        user.profile.address =
          updateUser.profile.address ?? user.profile.address;
        user.profile.gender = updateUser.profile.gender ?? user.profile.gender;
        user.profile.photo = updateUser.profile.photo ?? user.profile.photo;

        await profileRepo.save(user.profile);
      }
    }

    // 更新 roles
    if (
      updateUser.roles &&
      Array.isArray(updateUser.roles) &&
      updateUser.roles.length > 0
    ) {
      const roleIds = updateUser.roles
        .map((r) => Number(r))
        .filter((id) => !isNaN(id));

      if (roleIds.length > 0) {
        const roles = await this.roleRepo.findByIds(roleIds);
        if (roles.length !== roleIds.length) {
          throw new NotFoundException(
            'Some roles not found: ' + roleIds.join(', '),
          );
        }

        user.roles = roles;
      }
    }

    // 保存 user 本体及多对多关系
    return this.userRepo.save(user);
  }

  /* 这个只是适合单模型的update, 不适合有关系的模型update */
  update(userId: number, user: Partial<UserEntity>) {
    return this.userRepo.update(userId, user);
  }
}
