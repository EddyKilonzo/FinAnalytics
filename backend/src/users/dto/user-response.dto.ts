import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "../../common/enums/role.enum";
import { UserType } from "../../auth/dto/complete-onboarding.dto";

export class AdminUserDto {
  @ApiProperty({ example: "cuid123abc", description: "Unique user ID" })
  id: string;

  @ApiProperty({ example: "jane@example.com" })
  email: string;

  @ApiPropertyOptional({ example: "Jane Doe" })
  name: string | null;

  @ApiPropertyOptional({
    example:
      "https://res.cloudinary.com/your-cloud/image/upload/v1739900000/finanalytics/profile-pictures/user-1.jpg",
  })
  avatarUrl: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiPropertyOptional({
    example: "2026-02-18T10:00:00.000Z",
    description: "When the user confirmed ownership of their email address.",
  })
  emailVerifiedAt: Date | null;

  @ApiPropertyOptional({
    enum: UserType,
    example: UserType.UNIVERSITY_STUDENT,
    description: "Life stage selected during onboarding.",
  })
  userType: UserType | null;

  @ApiPropertyOptional({
    type: [String],
    example: ["allowance", "freelance"],
    description: "Income sources selected during onboarding.",
  })
  incomeSources: string[];

  @ApiProperty({
    example: false,
    description: "True once the user completes the onboarding wizard.",
  })
  onboardingCompleted: boolean;

  @ApiPropertyOptional({
    example: "2026-02-18T14:00:00.000Z",
    description:
      "When set, the account is suspended; user cannot log in or use the app.",
  })
  suspendedAt: Date | null;

  @ApiProperty({ example: "2026-02-18T10:00:00.000Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-02-18T10:00:00.000Z" })
  updatedAt: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 42, description: "Total matching users" })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 3, description: "Total pages available" })
  totalPages: number;
}

export class UserListResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [AdminUserDto] })
  data: AdminUserDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;
}

export class UserDetailStatsDto {
  @ApiProperty({ example: 42, description: "Number of transactions" })
  transactionCount: number;

  @ApiProperty({ example: 3, description: "Number of budgets" })
  budgetCount: number;

  @ApiProperty({ example: 2, description: "Number of goals" })
  goalCount: number;
}

export class AdminUserWithDetailsDto extends AdminUserDto {
  @ApiProperty({
    type: UserDetailStatsDto,
    description: "Summary counts for this user",
  })
  stats: UserDetailStatsDto;
}

export class UserDetailResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: AdminUserDto,
    description: "User without stats (from list)",
  })
  data: AdminUserDto;
}

export class UserDetailWithStatsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({
    type: AdminUserWithDetailsDto,
    description: "User with stats (from GET /:id)",
  })
  data: AdminUserWithDetailsDto;
}
