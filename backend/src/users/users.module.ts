import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';
import { MailerModule } from '../common/mailer/mailer.module';

@Module({
  imports: [CloudinaryModule, MailerModule],
  controllers: [UsersController, ProfileController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
