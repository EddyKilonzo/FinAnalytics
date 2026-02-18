/**
 * Re-export Prisma's generated Role enum so every module in the codebase
 * uses the exact same type that comes out of the database.
 *
 * If we defined our own enum here TypeScript would treat the two as
 * structurally different types even though the string values are identical,
 * causing "Type '"USER"' is not assignable to type 'Role'" errors.
 */
export { Role } from "@prisma/client";
