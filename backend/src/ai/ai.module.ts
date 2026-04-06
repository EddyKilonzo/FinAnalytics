import { Module } from "@nestjs/common";
import { AnthropicAiService } from "./anthropic-ai.service";

@Module({
  providers: [AnthropicAiService],
  exports: [AnthropicAiService],
})
export class AiModule {}
