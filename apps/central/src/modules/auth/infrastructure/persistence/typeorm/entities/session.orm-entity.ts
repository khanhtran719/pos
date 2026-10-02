import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('Sessions')
@Index(['userId'])
@Index(['expiresAt'])
@Index(['userId', 'revokedAt'])
export class SessionOrmEntity {
  @PrimaryColumn('uuid', { name: 'ID', comment: 'Mã định danh phiên' })
  id!: string;

  @Column({
    name: 'UserId',
    type: 'uuid',
    nullable: false,
    comment: 'Mã người dùng liên kết',
  })
  userId!: string;

  @Column({
    name: 'RefreshTokenFingerprint',
    type: 'varchar',
    length: 64,
    nullable: false,
    comment: 'SHA-256 fingerprint của refresh token',
  })
  refreshTokenFingerprint!: string;

  @Column({
    name: 'CreatedAt',
    type: 'timestamp with time zone',
    nullable: false,
    default: () => 'CURRENT_TIMESTAMP',
    comment: 'Thời điểm đăng nhập',
  })
  createdAt!: Date;

  @Column({
    name: 'ExpiresAt',
    type: 'timestamp with time zone',
    nullable: false,
    comment: 'Thời điểm refresh token hết hạn',
  })
  expiresAt!: Date;

  @Column({
    name: 'RotatedAt',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Thời điểm refresh token gần nhất được xoay vòng',
  })
  rotatedAt!: Date | null;

  @Column({
    name: 'RevokedAt',
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Thời điểm đăng xuất',
  })
  revokedAt!: Date | null;
}
