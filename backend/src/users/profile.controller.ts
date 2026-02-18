import {
  BadRequestException,
  Controller,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import type { AuthUser } from "../auth/strategies/jwt.strategy";
import { CloudinaryService } from "../common/cloudinary/cloudinary.service";
import { MailerService } from "../common/mailer/mailer.service";
import { UsersService } from "./users.service";
import { ErrorResponseDto } from "../auth/dto/auth-response.dto";
import { ProfilePictureResponseDto } from "./dto/profile-picture-response.dto";

interface AuthRequest extends Express.Request {
  user: AuthUser;
}

@ApiTags("Users")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("users")
export class ProfileController {
  private readonly logger = new Logger(ProfileController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly mailerService: MailerService,
  ) {}

  @Post("me/profile-picture")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const isImage = file.mimetype?.startsWith("image/");
        if (!isImage) {
          return cb(
            new BadRequestException("Only image files are allowed."),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  @ApiOperation({
    summary: "Upload profile picture",
    description:
      "Uploads a profile image to Cloudinary, saves avatar URL, and sends confirmation email.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
      required: ["file"],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Profile picture updated.",
    type: ProfilePictureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Invalid file upload.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized.",
    type: ErrorResponseDto,
  })
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: AuthRequest,
  ) {
    try {
      if (!file?.buffer) {
        throw new BadRequestException("Please upload an image file.");
      }

      const uploaded = await this.cloudinaryService.uploadProfileImage(
        file.buffer,
        req.user.id,
      );
      const updatedUser = await this.usersService.updateAvatar(
        req.user.id,
        uploaded.url,
      );

      await this.mailerService.sendProfilePictureUpdatedEmail({
        to: updatedUser.email,
        name: updatedUser.name,
        avatarUrl: uploaded.url,
      });

      return {
        success: true,
        message: "Profile picture updated successfully",
        data: { avatarUrl: uploaded.url },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error uploading profile picture for user ${req.user.id}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not update profile picture. Please try again.",
      );
    }
  }
}
