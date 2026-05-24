import { Module } from '@nestjs/common';
import { BulkUploadController } from 'src/games/bulk-upload/bulk-upload.controller';
import { BulkUploadService } from 'src/games/bulk-upload/bulk-upload.service';

@Module({
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}
