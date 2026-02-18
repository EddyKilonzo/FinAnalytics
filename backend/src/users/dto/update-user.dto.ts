import { IsString, IsOptional, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Display name (max 60 characters)',
    maxLength: 60,
  })
  @IsString()
  @IsOptional()
  @MaxLength(60, { message: 'Name must be at most 60 characters' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.ADMIN,
    description: 'Assign or revoke admin role. Admins cannot change their own role.',
  })
  @IsEnum(Role, { message: `role must be one of: ${Object.values(Role).join(', ')}` })
  @IsOptional()
  role?: Role;
}
