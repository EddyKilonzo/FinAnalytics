import { IsString, IsOptional, MaxLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";

export class UpdateProfileDto {
  @ApiPropertyOptional({
    example: "Jane Doe",
    description: "Display name (max 60 characters)",
    maxLength: 60,
  })
  @IsString()
  @IsOptional()
  @MaxLength(60, { message: "Name must be at most 60 characters" })
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;
}
