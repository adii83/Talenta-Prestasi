import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceSingleWinnerDecree1785839100000
  implements MigrationInterface
{
  name = 'EnforceSingleWinnerDecree1785839100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_active_winner_decree_per_competition" ON "competition_documents" ("competition_id") WHERE "document_role" = 'winner_decree' AND "is_active" = true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."uq_active_winner_decree_per_competition"`,
    );
  }
}
