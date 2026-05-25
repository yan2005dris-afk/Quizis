import { IsInt, IsIn } from 'class-validator';

export class GenerateReportDto {
  @IsInt()
  salaId!: number;

  @IsIn(['excel', 'csv'])
  formato!: 'excel' | 'csv';
}
