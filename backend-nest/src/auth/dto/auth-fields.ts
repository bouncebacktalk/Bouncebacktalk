import { applyDecorators } from "@nestjs/common";
import { Transform } from "class-transformer";
import { IsEmail, IsString, MaxLength, MinLength } from "class-validator";

/**
 * Reusable DTO field decorators. Composed with `applyDecorators` so a single
 * `@EmailField()` carries the transform + validation, the same way the old Zod
 * `EmailSchema`/`PasswordSchema` were shared. Used across auth + lead DTOs.
 */

/** Trimmed, lower-cased, validated email. */
export function EmailField() {
  return applyDecorators(
    Transform(({ value }) =>
      typeof value === "string" ? value.trim().toLowerCase() : value,
    ),
    IsEmail({}, { message: "Enter a valid email address." }),
  );
}

/** 8-128 character password. Intentionally simple for the starter. */
export function PasswordField() {
  return applyDecorators(
    IsString(),
    MinLength(8, { message: "Use at least 8 characters." }),
    MaxLength(128, { message: "Use 128 characters or fewer." }),
  );
}
