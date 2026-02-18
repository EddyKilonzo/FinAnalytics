import {
  IsString,
  IsNotEmpty,
  IsOptional,
  Matches,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({
    description: "Human-readable category name",
    example: "Food & Dining",
  })
  @IsString()
  @IsNotEmpty({ message: "name must not be empty" })
  @MaxLength(80, { message: "name must be at most 80 characters" })
  name: string;

  @ApiProperty({
    description:
      "URL-safe identifier (lowercase letters, numbers, hyphens only)",
    example: "food-dining",
  })
  @IsString()
  @IsNotEmpty({ message: "slug must not be empty" })
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/, {
    message: "slug may only contain lowercase letters, numbers, and hyphens",
  })
  @Transform(({ value }) => (value as string).toLowerCase().trim())
  slug: string;

  @ApiPropertyOptional({
    description: "Short description shown in the UI",
    example: "Restaurants, groceries, coffee",
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: "Hex colour used to highlight this category in charts",
    example: "#a855f7",
  })
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: "color must be a valid 6-digit hex code, e.g. #a855f7",
  })
  color?: string;
}
