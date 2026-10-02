import { EntityStatus } from '@shared/domain/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('Users')
@Index(['code'])
@Index(['originalId'])
@Index(['deleted'])
@Unique('UQ_Users_Code_NotDeleted', ['code'])
@Unique('UQ_Users_Sale_NotDeleted', ['sale'])
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'ID', comment: 'Mã định danh chính' })
  id!: string;

  @Column({
    name: 'UserGroupId',
    type: 'uuid',
    nullable: true,
    comment: 'Mã nhóm người dùng',
  })
  userGroupId?: string;

  @Column({
    name: 'Code',
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Mã người dùng duy nhất',
  })
  code!: string;

  @Column({
    name: 'Name',
    type: 'varchar',
    length: 255,
    nullable: false,
    comment: 'Tên người dùng',
  })
  name!: string;

  @Column({
    name: 'Sale',
    type: 'varchar',
    length: 50,
    nullable: false,
    comment: 'Mã bán hàng duy nhất',
  })
  sale!: string;

  @Column({
    name: 'SalePos',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: 'Mã đăng nhập POS',
  })
  salePos?: string | null;

  @Column({
    name: 'Pin',
    type: 'varchar',
    length: 255,
    nullable: false,
    select: false,
    comment: 'Mã bảo mật đã mã hóa',
  })
  pin!: string;

  @Column({
    name: 'Pass',
    type: 'text',
    nullable: false,
    select: false,
    comment: 'Mật khẩu đã băm',
  })
  pass!: string;

  @Column({
    name: 'FlagIsLocked',
    type: 'boolean',
    default: false,
    comment: 'Cờ khóa tài khoản',
  })
  flagIsLocked!: boolean;

  @Column({
    name: 'FlagIsFirstLogin',
    type: 'boolean',
    default: false,
    comment: 'Cờ đăng nhập đầu',
  })
  flagIsFirstLogin!: boolean;

  @Column({
    name: 'OriginalId',
    type: 'uuid',
    nullable: true,
    comment: 'Mã gốc để đồng bộ',
  })
  originalId?: string;

  @Column({
    name: 'FirebaseToken',
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Mã nhận thông báo',
  })
  firebaseToken?: string;

  @Column({
    name: 'PublicKey',
    type: 'text',
    nullable: true,
    comment: 'Khóa công khai xác thực',
  })
  publicKey?: string;

  @Column({
    name: 'Status',
    type: 'smallint',
    default: EntityStatus.ACTIVE,
    comment: 'Trạng thái bản ghi',
  })
  status!: EntityStatus;

  @Column({ name: 'CreatedBy', type: 'uuid', comment: 'Người tạo bản ghi' })
  createdBy!: string;

  @CreateDateColumn({
    name: 'CreatedDate',
    type: 'timestamp without time zone',
    comment: 'Ngày tạo bản ghi',
  })
  createdDate!: Date;

  @Column({ name: 'ModifiedBy', type: 'uuid', nullable: true, comment: 'Người sửa bản ghi' })
  modifiedBy?: string;

  @UpdateDateColumn({
    name: 'ModifiedDate',
    type: 'timestamp without time zone',
    comment: 'Ngày sửa bản ghi',
  })
  modifiedDate!: Date;

  @Column({ name: 'DeletedBy', type: 'uuid', nullable: true, comment: 'Người xóa bản ghi' })
  deletedBy?: string;

  @Column({
    name: 'DeletedDate',
    type: 'timestamp without time zone',
    nullable: true,
    comment: 'Ngày xóa bản ghi',
  })
  deletedDate?: Date;

  @Column({
    name: 'Deleted',
    type: 'boolean',
    default: false,
    comment: 'Cờ xóa mềm',
  })
  deleted!: boolean;
}
