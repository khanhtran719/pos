import { IsString, MinLength } from 'class-validator';

export class RefreshSessionRequestDto {
  @IsString({ message: 'Refresh token phải là chuỗi.' })
  @MinLength(1, { message: 'Refresh token không được để trống.' })
  refreshToken!: string;
}
