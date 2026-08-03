import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { PublicModule } from './public/public.module';
import { AdminModule } from './admin/admin.module';
import { MediaModule } from './media/media.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config: Record<string, unknown>) => {
        for (const key of [
          'DB_HOST',
          'DB_PORT',
          'DB_USERNAME',
          'DB_PASSWORD',
          'DB_DATABASE',
          'JWT_SECRET',
        ]) {
          if (!config[key])
            throw new Error(`Missing required environment variable: ${key}`);
        }
        if (String(config.JWT_SECRET).length < 32) {
          throw new Error('JWT_SECRET must contain at least 32 characters');
        }
        return config;
      },
    }),
    DatabaseModule,
    AuthModule,
    PublicModule,
    AdminModule,
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
