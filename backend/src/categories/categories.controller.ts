import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  InternalServerErrorException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import {
  CategoryDetailResponseDto,
  CategoryListResponseDto,
} from "./dto/category-response.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { AdminGuard } from "../common/guards/admin.guard";
import { ErrorResponseDto } from "../auth/dto/auth-response.dto";

/**
 * CategoriesController — manages spending categories.
 *
 * Access rules:
 *  - GET routes: any authenticated user (JWT required).
 *  - POST / PATCH / DELETE routes: ADMIN only (AdminGuard) — only admins can create/update/delete categories.
 */
@ApiTags("Categories")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard)
@Controller("categories")
export class CategoriesController {
  private readonly logger = new Logger(CategoriesController.name);

  constructor(private readonly categoriesService: CategoriesService) {}

  // ─── GET /api/v1/categories ───────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List all categories",
    description:
      "Returns every category ordered A-Z. Available to all authenticated users.",
  })
  @ApiResponse({
    status: 200,
    description: "Full category list.",
    type: CategoryListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  async findAll() {
    try {
      const data = await this.categoriesService.findAll();
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in findAll",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve categories. Please try again.",
      );
    }
  }

  // ─── GET /api/v1/categories/:id ───────────────────────────────────────────

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get a category by ID" })
  @ApiParam({ name: "id", description: "Category CUID", example: "cldxyz123" })
  @ApiResponse({ status: 200, type: CategoryDetailResponseDto })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Category not found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string) {
    try {
      const data = await this.categoriesService.findById(id);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error fetching category [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve category. Please try again.",
      );
    }
  }

  // ─── POST /api/v1/categories  [ADMIN] ─────────────────────────────────────

  @Post()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a category  [ADMIN]",
    description: "Slugs must be unique. Use lowercase-with-hyphens format.",
  })
  @ApiResponse({ status: 201, type: CategoryDetailResponseDto })
  @ApiResponse({
    status: 400,
    description: "Validation error.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Requires ADMIN role.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "A category with this slug already exists.",
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateCategoryDto) {
    try {
      const data = await this.categoriesService.create(dto);
      return { success: true, message: "Category created successfully", data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error creating category",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not create category. Please try again.",
      );
    }
  }

  // ─── PATCH /api/v1/categories/:id  [ADMIN] ────────────────────────────────

  @Patch(":id")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update a category  [ADMIN]" })
  @ApiParam({ name: "id", description: "Category CUID" })
  @ApiResponse({ status: 200, type: CategoryDetailResponseDto })
  @ApiResponse({
    status: 400,
    description: "Validation error.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Requires ADMIN role.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Category not found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "New slug already taken.",
    type: ErrorResponseDto,
  })
  async update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    try {
      const data = await this.categoriesService.update(id, dto);
      return { success: true, message: "Category updated successfully", data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error updating category [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not update category. Please try again.",
      );
    }
  }

  // ─── DELETE /api/v1/categories/:id  [ADMIN] ───────────────────────────────

  @Delete(":id")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete a category  [ADMIN]",
    description:
      "Permanently removes the category. Transactions referencing it will have " +
      "their categoryId set to null automatically (SetNull cascade).",
  })
  @ApiParam({ name: "id", description: "Category CUID" })
  @ApiResponse({ status: 200, description: "Category deleted successfully." })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Requires ADMIN role.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Category not found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string) {
    try {
      await this.categoriesService.delete(id);
      return { success: true, message: "Category deleted successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error deleting category [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not delete category. Please try again.",
      );
    }
  }
}
