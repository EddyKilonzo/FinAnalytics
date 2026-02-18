import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({
    example: 'jane@example.com',
    description: 'A valid email address. Will be lowercased.',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

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

  @ApiProperty({
    example: 'Secure@1234',
    description:
      'Password (8–72 chars). Must contain uppercase, lowercase, and a number or special character.',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d\W]).+$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number or special character',
  })
  password: string;
}
