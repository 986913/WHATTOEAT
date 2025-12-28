import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('roles') // 表名为复数
export class RoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roleName: string;
}
