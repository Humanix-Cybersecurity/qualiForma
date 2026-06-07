// SPDX-License-Identifier: AGPL-3.0-or-later
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ClamAvScanner, FILE_SCANNER } from './file-scanner';
import { OBJECT_STORAGE, S3ObjectStorage } from './object-storage';

@Module({
  imports: [AuthModule], // pour @Auth(...) (JwtAuthGuard + RolesGuard)
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    { provide: OBJECT_STORAGE, useClass: S3ObjectStorage },
    { provide: FILE_SCANNER, useClass: ClamAvScanner },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
