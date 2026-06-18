import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total de registros encontrados' })
  total: number;

  @ApiProperty({ description: 'Última página disponible' })
  ultimaPagina: number;

  @ApiProperty({ description: 'Página actual' })
  paginaActual: number;

  @ApiProperty({ description: 'Registros por página' })
  porPagina: number;

  @ApiProperty({ description: 'Página anterior', nullable: true })
  anterior: number | null;

  @ApiProperty({ description: 'Siguiente página', nullable: true })
  siguiente: number | null;
}
