import { PartialType } from "@nestjs/swagger";
import { CreateCategoryDto } from "./create-category.dto";

/**
 * All fields from CreateCategoryDto become optional so callers only send
 * the fields they actually want to change.
 */
export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {}
