import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'jane@example.com',
    description: 'The email address used at registration.',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: 'Secure@1234',
    description: 'Account password.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;
}
