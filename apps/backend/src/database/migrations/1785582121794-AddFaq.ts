import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFaq1785582121794 implements MigrationInterface {
  name = 'AddFaq1785582121794';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "faq_questions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "category_id" uuid NOT NULL, "question" text NOT NULL, "answer" text NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_763528586493656ef57ce31f9a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "faq_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_site_id" uuid NOT NULL, "title" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_c3a7f838a99baed5cbcbc5372db" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "faq_questions" ADD CONSTRAINT "FK_6611ddce0608d015ef95b47882b" FOREIGN KEY ("category_id") REFERENCES "faq_categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "faq_categories" ADD CONSTRAINT "FK_f9086ceae44b30ea98d82499dd4" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "faq_categories" DROP CONSTRAINT "FK_f9086ceae44b30ea98d82499dd4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "faq_questions" DROP CONSTRAINT "FK_6611ddce0608d015ef95b47882b"`,
    );
    await queryRunner.query(`DROP TABLE "faq_categories"`);
    await queryRunner.query(`DROP TABLE "faq_questions"`);
  }
}
