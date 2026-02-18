import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CategoryDto {
  @ApiProperty({ example: "cldxyz123" })
  id: string;

  @ApiProperty({ example: "Food & Dining" })
  name: string;

  @ApiProperty({ example: "food-dining" })
  slug: string;

  @ApiPropertyOptional({ example: "Restaurants, groceries, coffee" })
  description?: string | null;

  @ApiPropertyOptional({ example: "#22c55e" })
  color?: string | null;

  @ApiProperty()
  createdAt: Date;
}

export class CategoryListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [CategoryDto] })
  data: CategoryDto[];
}

export class CategoryDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: CategoryDto })
  data: CategoryDto;
}
