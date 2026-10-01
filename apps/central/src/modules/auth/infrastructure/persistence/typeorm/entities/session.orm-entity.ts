import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('Sessions')
@Index(['userId'])
@Index(['loginAt'])
@Index(['userId', 'logoutAt'])
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'ID', comment: 'Mã định danh chính' })
  id!: string;

  @Column({
    name: 'UserId',
    type: 'uuid',
    nullable: false,
    comment: 'Mã người dùng liên kết',
  })
  userId!: string;

  @Column({
    name: 'AccessToken',
    type: 'text',
    nullable: false,
    comment: 'Mã truy cập phiên',
  })
  accessToken!: string;

  @Column({
    name: 'RefreshToken',
    type: 'text',
    nullable: false,
    comment: 'Mã làm mới phiên',
  })
  refreshToken!: string;

  @Column({
    name: 'LoginAt',
    type: 'timestamp without time zone',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm đăng nhập',
  })
  loginAt!: Date;

  @Column({
    name: 'LogoutAt',
    type: 'timestamp without time zone',
    nullable: true,
    comment: 'Thời điểm đăng xuất',
  })
  logoutAt?: Date;
}
