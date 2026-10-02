import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';

export class LoginRequestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'Mã bán hàng phải là chuỗi.' })
  @Length(1, 50, { message: 'Mã bán hàng phải có từ 1 đến 50 ký tự.' })
  sale!: string;

  @IsString({ message: 'Mã PIN phải là chuỗi.' })
  @IsNotEmpty({ message: 'Mã PIN không được để trống.' })
  @MaxLength(255, { message: 'Mã PIN không được vượt quá 255 ký tự.' })
  pin!: string;
}
