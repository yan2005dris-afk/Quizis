import { Module } from '@nestjs/common';
import { BulkUploadModule } from 'src/games/bulk-upload/bulk-upload.module';

@Module({
  imports: [BulkUploadModule],
  exports: [BulkUploadModule],
})
export class GamesModule {}
