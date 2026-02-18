import {
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

/**
 * Translates Prisma-specific errors into NestJS HTTP exceptions so that raw
 * database details are never leaked to the client.
 *
 * Call this inside a catch block AFTER re-throwing known HttpExceptions:
 *
 *   try { ... }
 *   catch (error) {
 *     if (error instanceof HttpException) throw error;
 *     handlePrismaError(error, this.logger, 'MyService.myMethod');
 *   }
 */
export function handlePrismaError(
  error: unknown,
  logger: Logger,
  context: string,
): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002": {
        const fields =
          (error.meta?.target as string[] | undefined)?.join(", ") ?? "field";
        throw new ConflictException(
          `A record with this ${fields} already exists`,
        );
      }
      case "P2025":
        throw new NotFoundException("The requested record was not found");

      case "P2003":
        throw new ConflictException(
          "Operation failed: a related record does not exist",
        );

      default:
        logger.error(
          `Prisma known error [${error.code}] in ${context}: ${error.message}`,
        );
        throw new InternalServerErrorException(
          "A database error occurred. Please try again.",
        );
    }
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    logger.error(`Prisma validation error in ${context}: ${error.message}`);
    throw new InternalServerErrorException(
      "Invalid data provided to the database.",
    );
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    logger.error(`Prisma connection error in ${context}: ${error.message}`);
    throw new InternalServerErrorException(
      "Database connection failed. Please try again later.",
    );
  }

  // Truly unexpected — log full stack, expose nothing
  logger.error(
    `Unexpected error in ${context}`,
    error instanceof Error ? error.stack : String(error),
  );
  throw new InternalServerErrorException(
    "Something went wrong. Please try again later.",
  );
}
