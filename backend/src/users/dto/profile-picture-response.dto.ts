import { ApiProperty } from '@nestjs/swagger';

export class ProfilePictureDataDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/v1739900000/finanalytics/profile.jpg',
  })
  avatarUrl: string;
}

export class ProfilePictureResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Profile picture updated successfully' })
  message: string;

  @ApiProperty({ type: ProfilePictureDataDto })
  data: ProfilePictureDataDto;
}
