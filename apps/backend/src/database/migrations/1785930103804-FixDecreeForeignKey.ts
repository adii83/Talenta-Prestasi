import { MigrationInterface, QueryRunner } from "typeorm";

export class FixDecreeForeignKey1785930103804 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "competition_detail_settings" DROP CONSTRAINT "FK_bb0b69bbee66f0a437d25de22a2"`,
        );
        await queryRunner.query(
            `ALTER TABLE "competition_detail_settings" ADD CONSTRAINT "FK_bb0b69bbee66f0a437d25de22a2" FOREIGN KEY ("decree_document_id", "competition_id") REFERENCES "competition_documents"("id","competition_id") ON DELETE SET NULL ON UPDATE NO ACTION`,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "competition_detail_settings" DROP CONSTRAINT "FK_bb0b69bbee66f0a437d25de22a2"`,
        );
        await queryRunner.query(
            `ALTER TABLE "competition_detail_settings" ADD CONSTRAINT "FK_bb0b69bbee66f0a437d25de22a2" FOREIGN KEY ("decree_document_id", "competition_id") REFERENCES "competition_documents"("id","competition_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
        );
    }

}
