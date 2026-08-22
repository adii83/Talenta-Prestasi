import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConnectionOptions } from './database-options';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...databaseConnectionOptions(process.env),
        entities: [__dirname + '/../**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/migrations/[0-9]*{.ts,.js}'],
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
