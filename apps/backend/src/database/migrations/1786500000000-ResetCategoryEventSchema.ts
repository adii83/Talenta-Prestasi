import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reset migration: drops ALL existing tables and recreates the schema
 * from scratch with the new Category → Event hierarchy.
 *
 * This migration is destructive and intended for dev-only use.
 * The old `competitions` table and `event_site_archive_sources` are eliminated.
 */
export class ResetCategoryEventSchema1786500000000
  implements MigrationInterface
{
  name = 'ResetCategoryEventSchema1786500000000';

  public async up(runner: QueryRunner): Promise<void> {
    // Keep TypeORM's `migrations` ledger so this migration can be recorded.
    await runner.query(`
      DO $$
      DECLARE table_name text;
      BEGIN
        FOR table_name IN
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public' AND tablename <> 'migrations'
        LOOP
          EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', table_name);
        END LOOP;
      END $$`);
    await runner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Core tables ────────────────────────────────────────────────
    await runner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        email varchar NOT NULL,
        password_hash varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'active',
        last_login_at timestamptz,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_users_email ON users (email)`,
    );

    await runner.query(`
      CREATE TABLE organizations (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar NOT NULL,
        slug varchar NOT NULL,
        status varchar NOT NULL DEFAULT 'active',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_organizations_slug ON organizations (slug)`,
    );

    await runner.query(`
      CREATE TABLE organization_memberships (
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role varchar NOT NULL DEFAULT 'editor',
        created_at timestamp NOT NULL DEFAULT now(),
        PRIMARY KEY (organization_id, user_id)
      )`);

    await runner.query(`
      CREATE TABLE media_assets (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        storage_key varchar NOT NULL,
        original_name varchar NOT NULL DEFAULT '',
        mime_type varchar NOT NULL,
        byte_size bigint NOT NULL DEFAULT 0,
        checksum varchar,
        width int,
        height int,
        alt_text varchar NOT NULL DEFAULT '',
        status varchar NOT NULL DEFAULT 'pending',
        created_by uuid,
        created_at timestamp NOT NULL DEFAULT now()
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_media_assets_key ON media_assets (storage_key)`,
    );

    // ── Category (subdomain) ───────────────────────────────────────
    await runner.query(`
      CREATE TABLE competition_categories (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        slug varchar(100) NOT NULL,
        organizer_name varchar NOT NULL DEFAULT '',
        logo_asset_id uuid REFERENCES media_assets(id),
        favicon_asset_id uuid REFERENCES media_assets(id),
        status varchar NOT NULL DEFAULT 'active',
        publication_status varchar NOT NULL DEFAULT 'draft',
        published_at timestamptz,
        version int NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_category_slug_per_org ON competition_categories (organization_id, slug) WHERE deleted_at IS NULL`,
    );

    // ── Event / Periode ────────────────────────────────────────────
    await runner.query(`
      CREATE TABLE event_sites (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_id uuid NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
        organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        slug varchar(100) NOT NULL,
        is_active boolean NOT NULL DEFAULT false,
        status varchar NOT NULL DEFAULT 'active',
        mascot_asset_id uuid REFERENCES media_assets(id),
        fallback_icon varchar NOT NULL DEFAULT 'graduation-cap',
        description text NOT NULL DEFAULT '',
        version int NOT NULL DEFAULT 1,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        deleted_at timestamptz
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_event_slug_per_category ON event_sites (category_id, slug) WHERE deleted_at IS NULL`,
    );
    await runner.query(
      `CREATE UNIQUE INDEX uq_active_event_per_category ON event_sites (category_id) WHERE is_active = true AND deleted_at IS NULL`,
    );

    // ── Site domains (FK to category) ──────────────────────────────
    await runner.query(`
      CREATE TABLE site_domains (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_id uuid NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
        hostname varchar NOT NULL,
        is_primary boolean NOT NULL DEFAULT false,
        verified_at timestamptz
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_site_domains_hostname ON site_domains (hostname)`,
    );

    // ── Site settings (per event) ──────────────────────────────────
    await runner.query(`
      CREATE TABLE site_settings (
        event_site_id uuid PRIMARY KEY REFERENCES event_sites(id) ON DELETE CASCADE,
        primary_color varchar NOT NULL DEFAULT '#1e4b8c',
        navigation jsonb NOT NULL DEFAULT '{}',
        contact jsonb NOT NULL DEFAULT '{}',
        footer jsonb NOT NULL DEFAULT '{}',
        seo jsonb NOT NULL DEFAULT '{}'
      )`);

    // ── Audit logs ─────────────────────────────────────────────────
    await runner.query(`
      CREATE TABLE audit_logs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_site_id uuid NOT NULL REFERENCES event_sites(id) ON DELETE CASCADE,
        actor_user_id uuid,
        action varchar NOT NULL,
        entity_type varchar NOT NULL,
        entity_id uuid,
        changes jsonb,
        created_at timestamp NOT NULL DEFAULT now()
      )`);
    await runner.query(
      `CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id)`,
    );

    // ── Event documents (was competition_documents) ────────────────
    await runner.query(`
      CREATE TABLE event_documents (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_site_id uuid NOT NULL REFERENCES event_sites(id) ON DELETE CASCADE,
        asset_id uuid REFERENCES media_assets(id),
        title varchar NOT NULL,
        category varchar NOT NULL DEFAULT 'Dokumen',
        document_role varchar NOT NULL DEFAULT '',
        file_type varchar NOT NULL DEFAULT 'PDF',
        display_size varchar NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        CONSTRAINT uq_document_owner UNIQUE (id, event_site_id)
      )`);

    // ── Winner categories ──────────────────────────────────────────
    await runner.query(`
      CREATE TABLE winner_categories (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_site_id uuid NOT NULL REFERENCES event_sites(id) ON DELETE CASCADE,
        name varchar NOT NULL,
        rank_prefix varchar NOT NULL DEFAULT 'Juara',
        icon varchar NOT NULL DEFAULT 'trophy',
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        CONSTRAINT uq_category_owner UNIQUE (id, event_site_id)
      )`);

    // ── Winners ────────────────────────────────────────────────────
    await runner.query(`
      CREATE TABLE winners (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_site_id uuid NOT NULL,
        category_id uuid NOT NULL,
        photo_asset_id uuid REFERENCES media_assets(id),
        rank_label varchar NOT NULL DEFAULT '',
        full_name varchar NOT NULL,
        school varchar NOT NULL DEFAULT '',
        exam_number varchar NOT NULL DEFAULT '',
        district varchar NOT NULL DEFAULT '',
        regency varchar NOT NULL DEFAULT '',
        province varchar NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        FOREIGN KEY (category_id, event_site_id) REFERENCES winner_categories(id, event_site_id) ON DELETE CASCADE
      )`);

    // ── Event detail settings (was competition_detail_settings) ────
    await runner.query(`
      CREATE TABLE event_detail_settings (
        event_site_id uuid PRIMARY KEY REFERENCES event_sites(id) ON DELETE CASCADE,
        decree_document_id uuid,
        decree_title varchar NOT NULL DEFAULT 'SK Penetapan Pemenang',
        decree_description varchar NOT NULL DEFAULT 'Unduh dokumen resmi SK Pemenang untuk keperluan administrasi sekolah.',
        is_active boolean NOT NULL DEFAULT true,
        winners_active boolean NOT NULL DEFAULT true,
        documents_active boolean NOT NULL DEFAULT true,
        metadata_visibility jsonb NOT NULL DEFAULT '{}',
        FOREIGN KEY (decree_document_id, event_site_id) REFERENCES event_documents(id, event_site_id) ON DELETE SET NULL (decree_document_id)
      )`);

    // ── Archive settings ───────────────────────────────────────────
    await runner.query(`
      CREATE TABLE archive_category_settings (
        event_site_id uuid NOT NULL REFERENCES event_detail_settings(event_site_id) ON DELETE CASCADE,
        category_id uuid NOT NULL,
        is_visible boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        PRIMARY KEY (event_site_id, category_id),
        FOREIGN KEY (category_id, event_site_id) REFERENCES winner_categories(id, event_site_id) ON DELETE CASCADE
      )`);

    await runner.query(`
      CREATE TABLE archive_document_settings (
        event_site_id uuid NOT NULL REFERENCES event_detail_settings(event_site_id) ON DELETE CASCADE,
        document_id uuid NOT NULL,
        is_visible boolean NOT NULL DEFAULT true,
        label_override varchar NOT NULL DEFAULT '',
        sort_order int NOT NULL DEFAULT 0,
        PRIMARY KEY (event_site_id, document_id),
        FOREIGN KEY (document_id, event_site_id) REFERENCES event_documents(id, event_site_id) ON DELETE CASCADE
      )`);

    // ── Page settings ──────────────────────────────────────────────
    await runner.query(`
      CREATE TABLE page_settings (
        event_site_id uuid NOT NULL REFERENCES event_sites(id) ON DELETE CASCADE,
        page_type varchar NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        eyebrow varchar NOT NULL DEFAULT '',
        title varchar NOT NULL DEFAULT '',
        description text NOT NULL DEFAULT '',
        alignment varchar NOT NULL DEFAULT 'center',
        PRIMARY KEY (event_site_id, page_type)
      )`);

    await runner.query(`
      CREATE TABLE winner_page_settings (
        event_site_id uuid PRIMARY KEY REFERENCES event_sites(id) ON DELETE CASCADE,
        is_active boolean NOT NULL DEFAULT true,
        show_decree boolean NOT NULL DEFAULT true,
        decree_title varchar(200) NOT NULL DEFAULT 'SK Penetapan Pemenang',
        metadata_visibility jsonb NOT NULL DEFAULT '{}',
        archive_active boolean NOT NULL DEFAULT true,
        archive_limit int NOT NULL DEFAULT 3
      )`);

    // ── Home sections ──────────────────────────────────────────────
    await runner.query(`
      CREATE TABLE home_sections (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_site_id uuid NOT NULL REFERENCES event_sites(id) ON DELETE CASCADE,
        section_type varchar NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        settings jsonb NOT NULL DEFAULT '{}'
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_section_per_site ON home_sections (event_site_id, section_type)`,
    );

    await runner.query(`
      CREATE TABLE hero_badges (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        section_id uuid NOT NULL REFERENCES home_sections(id) ON DELETE CASCADE,
        label varchar NOT NULL DEFAULT '',
        sort_order int NOT NULL DEFAULT 0
      )`);

    await runner.query(`
      CREATE TABLE hero_actions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        section_id uuid NOT NULL REFERENCES home_sections(id) ON DELETE CASCADE,
        label varchar NOT NULL DEFAULT '',
        url varchar NOT NULL DEFAULT '',
        variant varchar NOT NULL DEFAULT 'primary',
        sort_order int NOT NULL DEFAULT 0
      )`);

    await runner.query(`
      CREATE TABLE schedule_items (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        section_id uuid NOT NULL REFERENCES home_sections(id) ON DELETE CASCADE,
        title varchar NOT NULL DEFAULT '',
        date varchar NOT NULL DEFAULT '',
        time_start varchar NOT NULL DEFAULT '',
        time_end varchar NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0
      )`);

    await runner.query(`
      CREATE TABLE pricing_packages (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        section_id uuid NOT NULL REFERENCES home_sections(id) ON DELETE CASCADE,
        title varchar NOT NULL DEFAULT '',
        price varchar NOT NULL DEFAULT '',
        is_featured boolean NOT NULL DEFAULT false,
        action_label varchar NOT NULL DEFAULT '',
        action_url varchar NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0
      )`);

    await runner.query(`
      CREATE TABLE pricing_facilities (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        package_id uuid NOT NULL REFERENCES pricing_packages(id) ON DELETE CASCADE,
        label varchar NOT NULL DEFAULT '',
        is_included boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0
      )`);

    await runner.query(`
      CREATE TABLE benefit_items (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        section_id uuid NOT NULL REFERENCES home_sections(id) ON DELETE CASCADE,
        title varchar NOT NULL DEFAULT '',
        description text NOT NULL DEFAULT '',
        icon varchar NOT NULL DEFAULT 'star',
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0
      )`);

    await runner.query(`
      CREATE TABLE partner_items (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        section_id uuid NOT NULL REFERENCES home_sections(id) ON DELETE CASCADE,
        name varchar NOT NULL DEFAULT '',
        logo_asset_id uuid REFERENCES media_assets(id),
        url varchar NOT NULL DEFAULT '',
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0
      )`);

    // ── Downloads (was download_competitions) ──────────────────────
    await runner.query(`
      CREATE TABLE download_tabs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_site_id uuid NOT NULL REFERENCES event_sites(id) ON DELETE CASCADE,
        custom_tab_name varchar NOT NULL DEFAULT '',
        is_default boolean NOT NULL DEFAULT false,
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0,
        CONSTRAINT uq_download_tab_owner UNIQUE (id, event_site_id)
      )`);
    await runner.query(
      `CREATE UNIQUE INDEX uq_default_download_per_event ON download_tabs (event_site_id) WHERE is_default = true`,
    );

    await runner.query(`
      CREATE TABLE download_document_settings (
        download_tab_id uuid NOT NULL,
        document_id uuid NOT NULL,
        event_site_id uuid NOT NULL,
        is_visible boolean NOT NULL DEFAULT true,
        label_override varchar NOT NULL DEFAULT '',
        sort_order int NOT NULL DEFAULT 0,
        PRIMARY KEY (download_tab_id, document_id),
        FOREIGN KEY (download_tab_id, event_site_id) REFERENCES download_tabs(id, event_site_id) ON DELETE CASCADE,
        FOREIGN KEY (document_id, event_site_id) REFERENCES event_documents(id, event_site_id) ON DELETE CASCADE
      )`);

    // ── FAQ ─────────────────────────────────────────────────────────
    await runner.query(`
      CREATE TABLE faq_categories (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        event_site_id uuid NOT NULL REFERENCES event_sites(id) ON DELETE CASCADE,
        title varchar NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0
      )`);

    await runner.query(`
      CREATE TABLE faq_questions (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        category_id uuid NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
        question text NOT NULL,
        answer text NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        sort_order int NOT NULL DEFAULT 0
      )`);
  }

  public async down(runner: QueryRunner): Promise<void> {
    await runner.query(`
      DO $$
      DECLARE table_name text;
      BEGIN
        FOR table_name IN
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public' AND tablename <> 'migrations'
        LOOP
          EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', table_name);
        END LOOP;
      END $$`);
  }
}
