import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHomeSections1785581663546 implements MigrationInterface {
  name = 'AddHomeSections1785581663546';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "hero_badges" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "label" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_394bd23bc9e8a74a9407f3c4870" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "hero_actions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "label" character varying NOT NULL, "target_url" character varying NOT NULL, "style" character varying NOT NULL DEFAULT 'primary', "new_tab" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_297c6877bb3b1aaf1d96f31def4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "schedule_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "label" character varying NOT NULL, "date_label" character varying NOT NULL, "description" text NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_035b2d214f67bd7ef775cb44ab1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pricing_packages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "name" character varying NOT NULL, "amount" bigint NOT NULL, "currency" character varying NOT NULL DEFAULT 'IDR', "unit_label" character varying NOT NULL DEFAULT '', "featured" boolean NOT NULL DEFAULT false, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_9e48469a36e2290a77ecd4885c3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "pricing_facilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "label" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_ec71d53c2f5065c4e67ec4ca036" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "partner_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "logo_asset_id" uuid, "name" character varying NOT NULL, "target_url" character varying NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_ece4a25b766a35bf90327137ee4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "home_sections" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_site_id" uuid NOT NULL, "section_type" character varying NOT NULL, "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', "settings" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "uq_home_section_type_per_site" UNIQUE ("event_site_id", "section_type"), CONSTRAINT "PK_301e3828256a380cdac96c9489a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "benefit_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "section_id" uuid NOT NULL, "title" character varying NOT NULL, "description" text NOT NULL DEFAULT '', "target_url" character varying NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_4f239d8595dbf9133b19c480d8a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "hero_badges" ADD CONSTRAINT "FK_ff9102fe79c35e608d15f41b700" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "hero_actions" ADD CONSTRAINT "FK_f2a5cd4fc9054d5f722a8995642" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_items" ADD CONSTRAINT "FK_377d277b5e3687b0dbd536aad44" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_packages" ADD CONSTRAINT "FK_065305cf98d9726a25e848e5453" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_facilities" ADD CONSTRAINT "FK_a33ad523085ee33065e1aaa394b" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_items" ADD CONSTRAINT "FK_0c8b92f7de1423647f0e56de152" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_items" ADD CONSTRAINT "FK_810a1a9e0b51a936c05876d5189" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "home_sections" ADD CONSTRAINT "FK_0804b208f76b9a51dccf9734108" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "benefit_items" ADD CONSTRAINT "FK_0eb642891525d54dc3321173f04" FOREIGN KEY ("section_id") REFERENCES "home_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "benefit_items" DROP CONSTRAINT "FK_0eb642891525d54dc3321173f04"`,
    );
    await queryRunner.query(
      `ALTER TABLE "home_sections" DROP CONSTRAINT "FK_0804b208f76b9a51dccf9734108"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_items" DROP CONSTRAINT "FK_810a1a9e0b51a936c05876d5189"`,
    );
    await queryRunner.query(
      `ALTER TABLE "partner_items" DROP CONSTRAINT "FK_0c8b92f7de1423647f0e56de152"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_facilities" DROP CONSTRAINT "FK_a33ad523085ee33065e1aaa394b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "pricing_packages" DROP CONSTRAINT "FK_065305cf98d9726a25e848e5453"`,
    );
    await queryRunner.query(
      `ALTER TABLE "schedule_items" DROP CONSTRAINT "FK_377d277b5e3687b0dbd536aad44"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hero_actions" DROP CONSTRAINT "FK_f2a5cd4fc9054d5f722a8995642"`,
    );
    await queryRunner.query(
      `ALTER TABLE "hero_badges" DROP CONSTRAINT "FK_ff9102fe79c35e608d15f41b700"`,
    );
    await queryRunner.query(`DROP TABLE "benefit_items"`);
    await queryRunner.query(`DROP TABLE "home_sections"`);
    await queryRunner.query(`DROP TABLE "partner_items"`);
    await queryRunner.query(`DROP TABLE "pricing_facilities"`);
    await queryRunner.query(`DROP TABLE "pricing_packages"`);
    await queryRunner.query(`DROP TABLE "schedule_items"`);
    await queryRunner.query(`DROP TABLE "hero_actions"`);
    await queryRunner.query(`DROP TABLE "hero_badges"`);
  }
}
