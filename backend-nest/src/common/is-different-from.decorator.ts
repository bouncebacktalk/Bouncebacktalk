import {
  registerDecorator,
  ValidatorConstraint,
  type ValidationArguments,
  type ValidationOptions,
  type ValidatorConstraintInterface,
} from "class-validator";

@ValidatorConstraint({ name: "isDifferentFrom" })
class IsDifferentFromConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [otherProperty] = args.constraints as [string];
    return value !== (args.object as Record<string, unknown>)[otherProperty];
  }

  defaultMessage(args: ValidationArguments): string {
    const [otherProperty] = args.constraints as [string];
    return `${args.property} must be different from ${otherProperty}`;
  }
}

/**
 * Cross-field validator: fails when this property equals another property's
 * value. The example for the template's "new password must differ from current".
 */
export function IsDifferentFrom(
  otherProperty: string,
  options?: ValidationOptions,
) {
  return (object: object, propertyName: string) =>
    registerDecorator({
      target: object.constructor,
      propertyName,
      constraints: [otherProperty],
      options,
      validator: IsDifferentFromConstraint,
    });
}
