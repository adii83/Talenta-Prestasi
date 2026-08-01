import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventSite } from '../entities/event-site.entity';
import { PublicController } from './public.controller';
import { PublicService } from './public.service';

@Module({
  imports: [TypeOrmModule.forFeature([EventSite])],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
