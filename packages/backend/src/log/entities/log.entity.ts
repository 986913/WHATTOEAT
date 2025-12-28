import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('logs')
export class LogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  path: string;

  @Column()
  method: string;

  @Column()
  data: string;

  @Column()
  result: number;
}
