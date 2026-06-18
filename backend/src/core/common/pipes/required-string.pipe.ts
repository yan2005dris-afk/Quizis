import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class RequiredStringPipe implements PipeTransform<unknown, string> {
  constructor(private readonly fieldName: string) {}

  transform(value: unknown): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${this.fieldName} es requerido`);
    }

    return value;
  }
}
