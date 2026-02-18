import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Role } from "../../common/enums/role.enum";
import { UserType } from "./complete-onboarding.dto";

export class UserDto {
  @ApiProperty({ example: "cuid123abc", description: "Unique user ID" })
  id: string;

  @ApiProperty({
    example: "jane@example.com",
    description: "User email address",
  })
  email: string;

  @ApiPropertyOptional({ example: "Jane Doe", description: "Display name" })
  name: string | null;

  @ApiPropertyOptional({
    example:
      "https://res.cloudinary.com/your-cloud/image/upload/v1739900000/finanalytics/profile-pictures/user-1.jpg",
    description: "Profile image URL",
  })
  avatarUrl: string | null;

  @ApiProperty({ enum: Role, example: Role.USER, description: "Account role" })
  role: Role;

  @ApiPropertyOptional({
    example: "2026-02-18T10:00:00.000Z",
    description:
      "Timestamp when email was verified. Null means not verified yet.",
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
}

export class AuthDataDto {
  @ApiProperty({ type: UserDto })
  user: UserDto;

  @ApiPropertyOptional({
    description: "JWT Bearer access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      "True when account must verify email before login can continue.",
  })
  requiresEmailVerification?: boolean;
}

export class AuthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: "Account created successfully" })
  message: string;

  @ApiProperty({ type: AuthDataDto })
  data: AuthDataDto;
}

export class ProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: UserDto })
  data: UserDto;
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: "Validation failed" })
  message: string;

  @ApiPropertyOptional({
    type: [String],
    example: [
      "email must be a valid email",
      "password must be longer than 8 characters",
    ],
    description: "Detailed field-level validation errors (only present on 400)",
  })
  errors?: string[];

  @ApiProperty({ example: "2026-02-18T10:00:00.000Z" })
  timestamp: string;

  @ApiProperty({ example: "/api/v1/auth/signup" })
  path: string;
}
