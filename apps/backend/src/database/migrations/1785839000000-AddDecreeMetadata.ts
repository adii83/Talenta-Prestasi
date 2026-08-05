import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDecreeMetadata1785839000000 implements MigrationInterface {
  name = 'AddDecreeMetadata1785839000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" ADD "decree_title" character varying NOT NULL DEFAULT 'SK Penetapan Pemenang'`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" ADD "decree_description" text NOT NULL DEFAULT 'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" DROP COLUMN "decree_description"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" DROP COLUMN "decree_title"`,
    );
  }
}
