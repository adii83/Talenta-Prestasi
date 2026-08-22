import 'dotenv/config';
import { DataSource } from 'typeorm';
import { databaseConnectionOptions } from './database-options';

export default new DataSource({
  ...databaseConnectionOptions(process.env, false),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/[0-9]*{.ts,.js}'],
  synchronize: false,
});
