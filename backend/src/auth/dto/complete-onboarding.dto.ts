import {
  IsEnum,
  IsArray,
  IsString,
  IsNotEmpty,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserType {
  FORM_FOUR_STUDENT = 'FORM_FOUR_STUDENT',
  UNIVERSITY_STUDENT = 'UNIVERSITY_STUDENT',
  RECENT_GRADUATE = 'RECENT_GRADUATE',
  YOUNG_PROFESSIONAL = 'YOUNG_PROFESSIONAL',
}

export class CompleteOnboardingDto {
  @ApiProperty({
    enum: UserType,
    example: UserType.UNIVERSITY_STUDENT,
    description: 'The life stage that best describes the user.',
  })
  @IsEnum(UserType, {
    message:
      'userType must be one of: FORM_FOUR_STUDENT, UNIVERSITY_STUDENT, RECENT_GRADUATE, YOUNG_PROFESSIONAL',
  })
  userType: UserType;

  @ApiProperty({
    type: [String],
    example: ['allowance', 'part_time_job', 'freelance'],
    description: 'List of income source keys the user selected.',
    maxItems: 10,
  })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(50, { each: true })
  @Transform(({ value }: { value: string[] }) =>
    Array.isArray(value) ? value.map((v) => v.trim().toLowerCase()) : value,
  )
  incomeSources: string[];
}
