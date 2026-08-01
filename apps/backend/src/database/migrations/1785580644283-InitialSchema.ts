import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1785580644283 implements MigrationInterface {
  name = 'InitialSchema1785580644283';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "last_login_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users"  ("email") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organization_memberships" ("organization_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" character varying NOT NULL DEFAULT 'editor', "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_caa73db1b161fa6b3a042290fe7" PRIMARY KEY ("organization_id", "user_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "media_assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "storage_key" character varying NOT NULL, "original_name" character varying NOT NULL DEFAULT '', "mime_type" character varying NOT NULL, "byte_size" bigint NOT NULL DEFAULT '0', "checksum" character varying, "width" integer, "height" integer, "alt_text" character varying NOT NULL DEFAULT '', "status" character varying NOT NULL DEFAULT 'pending', "created_by" uuid, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_ca47e9f67a5e5d8af1e75d66ee6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_8519ae0d2926772a395d110a1a" ON "media_assets"  ("storage_key") `,
    );
    await queryRunner.query(
      `CREATE TABLE "organizations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "slug" character varying NOT NULL, "status" character varying NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_963693341bd612aa01ddf3a4b6" ON "organizations"  ("slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "site_domains" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_site_id" uuid NOT NULL, "hostname" character varying NOT NULL, "is_primary" boolean NOT NULL DEFAULT false, "verified_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_59a65164f2879f957acf95f4789" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a96ae7420bf21c00b964475c9b" ON "site_domains"  ("hostname") `,
    );
    await queryRunner.query(
      `CREATE TABLE "site_settings" ("event_site_id" uuid NOT NULL, "primary_color" character varying NOT NULL DEFAULT '#1e4b8c', "navigation" jsonb NOT NULL DEFAULT '{}', "contact" jsonb NOT NULL DEFAULT '{}', "footer" jsonb NOT NULL DEFAULT '{}', "seo" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_1422d6def87c8185bcb6d0cfd6b" PRIMARY KEY ("event_site_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_site_id" uuid NOT NULL, "actor_user_id" uuid, "action" character varying NOT NULL, "entity_type" character varying NOT NULL, "entity_id" uuid, "changes" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_audit_entity" ON "audit_logs"  ("entity_type", "entity_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "event_sites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "organization_id" uuid NOT NULL, "name" character varying NOT NULL, "slug" character varying NOT NULL, "organizer_name" character varying NOT NULL DEFAULT '', "logo_asset_id" uuid, "status" character varying NOT NULL DEFAULT 'active', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_84353085f2c5d52cf183c31e824" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_site_slug_per_org" ON "event_sites"  ("organization_id", "slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "competition_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "competition_id" uuid NOT NULL, "asset_id" uuid, "legacy_key" character varying, "title" character varying NOT NULL, "category" character varying NOT NULL DEFAULT 'Dokumen', "document_role" character varying NOT NULL DEFAULT '', "file_type" character varying NOT NULL DEFAULT 'PDF', "display_size" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "uq_document_owner" UNIQUE ("id", "competition_id"), CONSTRAINT "PK_5ce083c685fe7b46c80ad4dbab7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "winners" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "competition_id" uuid NOT NULL, "category_id" uuid NOT NULL, "photo_asset_id" uuid, "legacy_key" character varying, "rank_label" character varying NOT NULL DEFAULT '', "full_name" character varying NOT NULL, "school" character varying NOT NULL DEFAULT '', "exam_number" character varying NOT NULL DEFAULT '', "district" character varying NOT NULL DEFAULT '', "regency" character varying NOT NULL DEFAULT '', "province" character varying NOT NULL DEFAULT '', "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_45701ddf409cead5c6e92a12ce8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "winner_categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "competition_id" uuid NOT NULL, "legacy_key" character varying, "name" character varying NOT NULL, "rank_prefix" character varying NOT NULL DEFAULT 'Juara', "icon" character varying NOT NULL DEFAULT 'trophy', "is_active" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "uq_category_owner" UNIQUE ("id", "competition_id"), CONSTRAINT "PK_d523c324a2fd34be9cab7a0dc89" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "competitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_site_id" uuid NOT NULL, "legacy_key" character varying, "name" character varying NOT NULL, "short_name" character varying NOT NULL DEFAULT '', "slug" character varying NOT NULL, "lifecycle" character varying NOT NULL DEFAULT 'current', "publication_status" character varying NOT NULL DEFAULT 'draft', "mascot_asset_id" uuid, "fallback_icon" character varying NOT NULL DEFAULT 'graduation-cap', "description" text NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', "published_at" TIMESTAMP WITH TIME ZONE, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_ef273910798c3a542b475e75c7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_competition_slug_per_site" ON "competitions"  ("event_site_id", "slug") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_current_competition_per_site" ON "competitions" ("event_site_id") WHERE "lifecycle" = 'current' AND "deleted_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "archive_document_settings" ("competition_id" uuid NOT NULL, "document_id" uuid NOT NULL, "is_visible" boolean NOT NULL DEFAULT true, "label_override" character varying NOT NULL DEFAULT '', "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_352d5add6672b019010e6db8352" PRIMARY KEY ("competition_id", "document_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "competition_detail_settings" ("competition_id" uuid NOT NULL, "decree_document_id" uuid, "is_active" boolean NOT NULL DEFAULT true, "winners_active" boolean NOT NULL DEFAULT true, "documents_active" boolean NOT NULL DEFAULT true, "metadata_visibility" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_fc109ba4e69b85ae1ce16d80839" PRIMARY KEY ("competition_id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "archive_category_settings" ("competition_id" uuid NOT NULL, "category_id" uuid NOT NULL, "is_visible" boolean NOT NULL DEFAULT true, "sort_order" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_f53f7070b12b6e96e8a679c4b81" PRIMARY KEY ("competition_id", "category_id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_memberships" ADD CONSTRAINT "FK_86ae2efbb9ce84dd652e0c96a49" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_memberships" ADD CONSTRAINT "FK_5352fc550034d507d6c76dd2901" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" ADD CONSTRAINT "FK_fbaaacdcbcf16e7a870198612a1" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_domains" ADD CONSTRAINT "FK_96a6a158ac57d1b5c3e3e10ad3f" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_settings" ADD CONSTRAINT "FK_1422d6def87c8185bcb6d0cfd6b" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_5b72acc612a4b619f28d85116eb" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" ADD CONSTRAINT "FK_78b6fa3d27cf837bc4471fb1d76" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" ADD CONSTRAINT "FK_25714c9cfa88724b2ada9cbd82f" FOREIGN KEY ("logo_asset_id") REFERENCES "media_assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_documents" ADD CONSTRAINT "FK_372bfb46ca434df98bf1c1fd7c9" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_documents" ADD CONSTRAINT "FK_45714b1baf7bd2ee23bb37b87c3" FOREIGN KEY ("asset_id") REFERENCES "media_assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "winners" ADD CONSTRAINT "FK_5c16c664ff127e5a60933944eea" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "winners" ADD CONSTRAINT "FK_b0f3282efc3f0e5f07fa788a0d5" FOREIGN KEY ("category_id", "competition_id") REFERENCES "winner_categories"("id","competition_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "winners" ADD CONSTRAINT "FK_115124fd3996d0c6d206ef9038d" FOREIGN KEY ("photo_asset_id") REFERENCES "media_assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "winner_categories" ADD CONSTRAINT "FK_4d3e91e11a3b28b3dbb57025237" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "competitions" ADD CONSTRAINT "FK_50e453ef93d6eb340f3ab896200" FOREIGN KEY ("event_site_id") REFERENCES "event_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "competitions" ADD CONSTRAINT "FK_839ead8f1a67ca965a4400ee6b3" FOREIGN KEY ("mascot_asset_id") REFERENCES "media_assets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "archive_document_settings" ADD CONSTRAINT "FK_0c606b823428467d530e7156562" FOREIGN KEY ("competition_id") REFERENCES "competition_detail_settings"("competition_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "archive_document_settings" ADD CONSTRAINT "FK_352d5add6672b019010e6db8352" FOREIGN KEY ("document_id", "competition_id") REFERENCES "competition_documents"("id","competition_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" ADD CONSTRAINT "FK_fc109ba4e69b85ae1ce16d80839" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" ADD CONSTRAINT "FK_bb0b69bbee66f0a437d25de22a2" FOREIGN KEY ("decree_document_id", "competition_id") REFERENCES "competition_documents"("id","competition_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "archive_category_settings" ADD CONSTRAINT "FK_5a49dace93cd92a7f5e95f28db6" FOREIGN KEY ("competition_id") REFERENCES "competition_detail_settings"("competition_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "archive_category_settings" ADD CONSTRAINT "FK_f53f7070b12b6e96e8a679c4b81" FOREIGN KEY ("category_id", "competition_id") REFERENCES "winner_categories"("id","competition_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "archive_category_settings" DROP CONSTRAINT "FK_f53f7070b12b6e96e8a679c4b81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "archive_category_settings" DROP CONSTRAINT "FK_5a49dace93cd92a7f5e95f28db6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" DROP CONSTRAINT "FK_bb0b69bbee66f0a437d25de22a2"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_detail_settings" DROP CONSTRAINT "FK_fc109ba4e69b85ae1ce16d80839"`,
    );
    await queryRunner.query(
      `ALTER TABLE "archive_document_settings" DROP CONSTRAINT "FK_352d5add6672b019010e6db8352"`,
    );
    await queryRunner.query(
      `ALTER TABLE "archive_document_settings" DROP CONSTRAINT "FK_0c606b823428467d530e7156562"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competitions" DROP CONSTRAINT "FK_839ead8f1a67ca965a4400ee6b3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competitions" DROP CONSTRAINT "FK_50e453ef93d6eb340f3ab896200"`,
    );
    await queryRunner.query(
      `ALTER TABLE "winner_categories" DROP CONSTRAINT "FK_4d3e91e11a3b28b3dbb57025237"`,
    );
    await queryRunner.query(
      `ALTER TABLE "winners" DROP CONSTRAINT "FK_115124fd3996d0c6d206ef9038d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "winners" DROP CONSTRAINT "FK_b0f3282efc3f0e5f07fa788a0d5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "winners" DROP CONSTRAINT "FK_5c16c664ff127e5a60933944eea"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_documents" DROP CONSTRAINT "FK_45714b1baf7bd2ee23bb37b87c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "competition_documents" DROP CONSTRAINT "FK_372bfb46ca434df98bf1c1fd7c9"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" DROP CONSTRAINT "FK_25714c9cfa88724b2ada9cbd82f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "event_sites" DROP CONSTRAINT "FK_78b6fa3d27cf837bc4471fb1d76"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_5b72acc612a4b619f28d85116eb"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_settings" DROP CONSTRAINT "FK_1422d6def87c8185bcb6d0cfd6b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "site_domains" DROP CONSTRAINT "FK_96a6a158ac57d1b5c3e3e10ad3f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "media_assets" DROP CONSTRAINT "FK_fbaaacdcbcf16e7a870198612a1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_memberships" DROP CONSTRAINT "FK_5352fc550034d507d6c76dd2901"`,
    );
    await queryRunner.query(
      `ALTER TABLE "organization_memberships" DROP CONSTRAINT "FK_86ae2efbb9ce84dd652e0c96a49"`,
    );
    await queryRunner.query(`DROP TABLE "archive_category_settings"`);
    await queryRunner.query(`DROP TABLE "competition_detail_settings"`);
    await queryRunner.query(`DROP TABLE "archive_document_settings"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_current_competition_per_site"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."uq_competition_slug_per_site"`,
    );
    await queryRunner.query(`DROP TABLE "competitions"`);
    await queryRunner.query(`DROP TABLE "winner_categories"`);
    await queryRunner.query(`DROP TABLE "winners"`);
    await queryRunner.query(`DROP TABLE "competition_documents"`);
    await queryRunner.query(`DROP INDEX "public"."uq_site_slug_per_org"`);
    await queryRunner.query(`DROP TABLE "event_sites"`);
    await queryRunner.query(`DROP INDEX "public"."idx_audit_entity"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "site_settings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a96ae7420bf21c00b964475c9b"`,
    );
    await queryRunner.query(`DROP TABLE "site_domains"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_963693341bd612aa01ddf3a4b6"`,
    );
    await queryRunner.query(`DROP TABLE "organizations"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8519ae0d2926772a395d110a1a"`,
    );
    await queryRunner.query(`DROP TABLE "media_assets"`);
    await queryRunner.query(`DROP TABLE "organization_memberships"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`,
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
