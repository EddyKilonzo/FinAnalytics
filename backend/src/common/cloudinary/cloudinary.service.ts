import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

interface UploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>("CLOUDINARY_CLOUD_NAME"),
      api_key: this.config.get<string>("CLOUDINARY_API_KEY"),
      api_secret: this.config.get<string>("CLOUDINARY_API_SECRET"),
    });
  }

  async uploadProfileImage(
    fileBuffer: Buffer,
    userId: string,
  ): Promise<UploadResult> {
    if (!fileBuffer?.length) {
      throw new InternalServerErrorException(
        "Could not process uploaded image.",
      );
    }

    try {
      const result = await new Promise<{
        secure_url: string;
        public_id: string;
      }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "finanalytics/profile-pictures",
            resource_type: "image",
            public_id: `user-${userId}-${Date.now()}`,
            overwrite: true,
          },
          (error, uploaded) => {
            if (error || !uploaded)
              return reject(error ?? new Error("Cloudinary upload failed"));
            resolve(uploaded as { secure_url: string; public_id: string });
          },
        );

        uploadStream.end(fileBuffer);
      });

      return { url: result.secure_url, publicId: result.public_id };
    } catch (error) {
      this.logger.error(
        `Cloudinary upload failed for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Image upload failed. Please try again.",
      );
    }
  }
}
