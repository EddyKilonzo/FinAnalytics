import { IsString, MinLength, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class ChangePasswordDto {
  @ApiProperty({ example: "OldPass123!", description: "Current password" })
  @IsString()
  currentPassword: string;

  @ApiProperty({
    example: "NewPass456!",
    description: "New password (min 8 characters)",
    minLength: 8,
  })
  @IsString()
  @MinLength(8, { message: "New password must be at least 8 characters" })
  @MaxLength(128, { message: "New password must be at most 128 characters" })
  newPassword: string;
}
