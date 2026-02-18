import {
  Injectable,
  Logger,
  HttpException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { handlePrismaError } from '../common/helpers/prisma-error.handler';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

/** The shape we hand back to callers — no generated Prisma namespace needed. */
export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string | null;
  createdAt: Date;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Loose cast so we can call Prisma model methods without importing the
   * generated namespace types — avoids TS export mismatches seen in this project.
   */
  private get db() {
    return this.prisma as any;
  }

  // ─── Read ──────────────────────────────────────────────────────────────────

  /**
   * Return every category sorted A-Z.
   * Category count is small (<50) so no pagination is needed here.
   */
  async findAll(): Promise<CategoryEntity[]> {
    try {
      return await this.db.category.findMany({ orderBy: { name: 'asc' } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'CategoriesService.findAll');
    }
  }

  /**
   * Find one category by its CUID primary key.
   * Throws 404 so callers never have to do a null-check themselves.
   */
  async findById(id: string): Promise<CategoryEntity> {
    try {
      const category = await this.db.category.findUnique({ where: { id } });

      if (!category) {
        throw new NotFoundException(`Category with id "${id}" was not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'CategoriesService.findById');
    }
  }

  /**
   * Find one category by its URL-safe slug.
   * Throws 404 if not found.
   */
  async findBySlug(slug: string): Promise<CategoryEntity> {
    try {
      const category = await this.db.category.findUnique({ where: { slug } });

      if (!category) {
        throw new NotFoundException(`Category with slug "${slug}" was not found`);
      }

      return category;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'CategoriesService.findBySlug');
    }
  }

  // ─── Write (Admin only — enforced in controller) ──────────────────────────

  /**
   * Create a new category.
   * Prisma throws P2002 if the slug is already taken; handlePrismaError maps
   * that to a 409 ConflictException so the client gets a clear error.
   */
  async create(dto: CreateCategoryDto): Promise<CategoryEntity> {
    try {
      const category = await this.db.category.create({ data: dto });
      this.logger.log(`Category created: "${category.name}" (slug: ${category.slug})`);
      return category;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'CategoriesService.create');
    }
  }

  /**
   * Update name, description, color, or slug for an existing category.
   * Confirms the record exists before touching the DB.
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryEntity> {
    try {
      // Confirm the target exists — throws 404 if missing
      await this.findById(id);

      const updated = await this.db.category.update({ where: { id }, data: dto });

      this.logger.log(`Category updated: "${updated.name}" (${id})`);
      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'CategoriesService.update');
    }
  }

  /**
   * Permanently remove a category.
   * Any transactions that reference it will have their categoryId set to null
   * automatically via the Prisma schema's SetNull delete rule.
   */
  async delete(id: string): Promise<void> {
    try {
      // Confirm the target exists — throws 404 if missing
      await this.findById(id);

      await this.db.category.delete({ where: { id } });
      this.logger.log(`Category deleted: ${id}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'CategoriesService.delete');
    }
  }

  /**
   * Insert or update a category by slug.
   * Used exclusively by the seed script so re-running it never creates
   * duplicates — it just updates the existing record instead.
   */
  async upsertBySlug(slug: string, data: Omit<CreateCategoryDto, 'slug'>): Promise<CategoryEntity> {
    try {
      return await this.db.category.upsert({
        where: { slug },
        create: { ...data, slug },
        update: { ...data },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'CategoriesService.upsertBySlug');
    }
  }
}
