import { IsInt } from 'class-validator';

export class GenerateReportDto {
  @IsInt()
  salaId!: number;
}
