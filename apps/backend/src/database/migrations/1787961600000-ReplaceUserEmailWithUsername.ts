import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplaceUserEmailWithUsername1787961600000
  implements MigrationInterface
{
  name = 'ReplaceUserEmailWithUsername1787961600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_users_username"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_username"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
            AND column_name = 'email'
        ) THEN
          ALTER TABLE "users" RENAME COLUMN "email" TO "username";
        END IF;
      END $$
    `);
    await queryRunner.query(`
      DO $$
      DECLARE
        user_row record;
        base_username text;
        candidate text;
        suffix integer;
      BEGIN
        CREATE TEMP TABLE used_usernames (
          username varchar(64) PRIMARY KEY
        ) ON COMMIT DROP;

        FOR user_row IN SELECT id, username FROM users ORDER BY id LOOP
          base_username := trim(both '-' from regexp_replace(
            split_part(lower(trim(user_row.username)), '@', 1),
            '[^a-z0-9._-]+', '-', 'g'
          ));
          IF length(base_username) < 3 THEN
            base_username := 'user';
          END IF;
          base_username := left(base_username, 64);
          candidate := base_username;
          suffix := 1;

          WHILE EXISTS (
            SELECT 1 FROM used_usernames WHERE username = candidate
          ) LOOP
            suffix := suffix + 1;
            candidate := left(base_username, 64 - length(suffix::text) - 1)
              || '-' || suffix;
          END LOOP;

          INSERT INTO used_usernames(username) VALUES(candidate);
          UPDATE users SET username = candidate WHERE id = user_row.id;
        END LOOP;
      END $$
    `);
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "username" TYPE varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "chk_users_username" CHECK (username ~ '^[a-z0-9._-]{3,64}$')`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_username" ON "users" ("username")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "uq_users_username"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "chk_users_username"`,
    );
    await queryRunner.query(
      `UPDATE "users" SET "username" = username || '@legacy.local'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" RENAME COLUMN "username" TO "email"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "email" TYPE varchar`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email")`,
    );
  }
}
