import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompetitionCategory } from '../entities/competition-category.entity';
import { EventSite } from '../entities/event-site.entity';
import { AuthModule } from '../auth/auth.module';
import {
  AdminCategoryController,
  AdminController,
  AdminSessionController,
} from './admin.controller';
import { AdminService } from './admin.service';
import { AdminContentController } from './admin-content.controller';
import { AdminContentService } from './admin-content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompetitionCategory, EventSite]),
    AuthModule,
  ],
  controllers: [
    AdminSessionController,
    AdminCategoryController,
    AdminController,
    AdminContentController,
  ],
  providers: [AdminService, AdminContentService],
})
export class AdminModule {}
