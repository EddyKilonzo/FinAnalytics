import { Module } from "@nestjs/common";
import { LessonsController } from "./lessons.controller";
import { LessonsService } from "./lessons.service";
import { LessonAiService } from "./lesson-ai.service";

@Module({
  controllers: [LessonsController],
  providers: [LessonsService, LessonAiService],
  exports: [LessonsService, LessonAiService],
})
export class LessonsModule {}
