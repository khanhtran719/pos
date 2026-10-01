import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

function getFirstValidationMessage(errors: ValidationError[]): string | null {
  for (const error of errors) {
    const constraints = error.constraints
      ? Object.values(error.constraints)
      : [];
    const firstConstraint = constraints[0];
    if (firstConstraint) {
      return firstConstraint;
    }

    const childMessage = getFirstValidationMessage(error.children ?? []);
    if (childMessage) {
      return childMessage;
    }
  }

  return null;
}

/** Tạo validation pipe dùng chung và trả lỗi đầu tiên cho phía gọi API. */
export function createGlobalValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    stopAtFirstError: true,
    exceptionFactory: (errors) =>
      new BadRequestException(
        getFirstValidationMessage(errors) ?? 'Dữ liệu không hợp lệ.',
      ),
  });
}
