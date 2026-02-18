import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";
import { Transform } from "class-transformer";

export class VerifyEmailDto {
  @ApiProperty({
    example: "jane@example.com",
    description: "Email address used during signup.",
  })
  @IsEmail({}, { message: "Please provide a valid email address" })
  @Transform(({ value }: { value: string }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({
    example: "f6f8f3f5e2a24e55b7e0f23f0c31fe57f2f7",
    description:
      "Verification value from email. Can be a long token link value or a 6-digit code.",
  })
  @IsString()
  @MinLength(6, { message: "Verification value is invalid" })
  token: string;
}
