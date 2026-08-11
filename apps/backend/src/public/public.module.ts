import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicContentService } from './public-content.service';
import { PreviewTokenService } from './preview-token.service';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';
import { WorkspaceSnapshotService } from './workspace-snapshot.service';

@Module({
  imports: [AuthModule],
  controllers: [PublicController],
  providers: [
    PublicService,
    PublicContentService,
    WorkspaceSnapshotService,
    PreviewTokenService,
  ],
  exports: [
    PublicContentService,
    WorkspaceSnapshotService,
    PreviewTokenService,
  ],
})
export class PublicModule {}
