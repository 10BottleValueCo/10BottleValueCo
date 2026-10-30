<?php
defined('ABSPATH') || exit;

/**
 * Three private tables (InnoDB, same database as WooCommerce so each record
 * write and its mapping row commit or roll back together):
 *  - tbv_legacy_map:     one row per imported source row (all entities); the idempotence ledger.
 *  - tbv_legacy_records: preserved financial records that have no native Woo object
 *                        (store credit balances/ledger/adjustments, affiliates, attributions,
 *                        payouts, payment attempts). Inactive history only: nothing reads
 *                        these to grant spendable credit or pay commissions.
 *  - tbv_legacy_runs:    one row per non-dry run, for audit and interruption detection.
 */
final class TBV_LM_Schema
{
    public static function table(string $name): string
    {
        global $wpdb;
        return $wpdb->prefix . 'tbv_legacy_' . $name;
    }

    public static function exists(): bool
    {
        global $wpdb;
        foreach (['map', 'records', 'runs'] as $t) {
            $name = self::table($t);
            if ($wpdb->get_var($wpdb->prepare('SHOW TABLES LIKE %s', $name)) !== $name) {
                return false;
            }
        }
        return true;
    }

    public static function install(): void
    {
        global $wpdb;
        require_once ABSPATH . 'wp-admin/includes/upgrade.php';
        $charset = $wpdb->get_charset_collate();
        $map = self::table('map');
        $records = self::table('records');
        $runs = self::table('runs');

        dbDelta("CREATE TABLE {$map} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  entity varchar(40) NOT NULL,
  source_key varchar(191) NOT NULL,
  source_hash char(64) NOT NULL,
  dest_type varchar(20) NOT NULL,
  dest_id bigint(20) unsigned NOT NULL,
  revision int(10) unsigned NOT NULL DEFAULT 1,
  run_id bigint(20) unsigned NOT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY entity_key (entity,source_key),
  KEY dest (dest_type,dest_id)
) ENGINE=InnoDB {$charset};");

        dbDelta("CREATE TABLE {$records} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  entity varchar(40) NOT NULL,
  source_key varchar(191) NOT NULL,
  source_customer_id varchar(64) DEFAULT NULL,
  email varchar(254) DEFAULT NULL,
  wp_user_id bigint(20) unsigned DEFAULT NULL,
  source_order_id varchar(191) DEFAULT NULL,
  wc_order_id bigint(20) unsigned DEFAULT NULL,
  affiliate_code varchar(100) DEFAULT NULL,
  amount_cents bigint(20) DEFAULT NULL,
  before_cents bigint(20) DEFAULT NULL,
  balance_cents bigint(20) DEFAULT NULL,
  kind varchar(40) DEFAULT NULL,
  state varchar(40) DEFAULT NULL,
  provider varchar(40) DEFAULT NULL,
  occurred_at datetime DEFAULT NULL,
  payload longtext NOT NULL,
  payload_hash char(64) NOT NULL,
  revisions longtext DEFAULT NULL,
  run_id bigint(20) unsigned NOT NULL,
  created_at datetime NOT NULL,
  updated_at datetime NOT NULL,
  PRIMARY KEY  (id),
  UNIQUE KEY entity_key (entity,source_key),
  KEY email (email(100)),
  KEY wp_user (wp_user_id),
  KEY wc_order (wc_order_id),
  KEY source_order (source_order_id),
  KEY affiliate (affiliate_code)
) ENGINE=InnoDB {$charset};");

        dbDelta("CREATE TABLE {$runs} (
  id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  status varchar(20) NOT NULL,
  export_sha256 char(64) NOT NULL,
  options longtext DEFAULT NULL,
  summary longtext DEFAULT NULL,
  started_at datetime NOT NULL,
  finished_at datetime DEFAULT NULL,
  PRIMARY KEY  (id)
) ENGINE=InnoDB {$charset};");

        update_option('tbv_lm_schema_version', TBV_LM_SCHEMA_VERSION, false);
    }

    public static function ensure(): void
    {
        if (get_option('tbv_lm_schema_version') !== TBV_LM_SCHEMA_VERSION || !self::exists()) {
            self::install();
        }
    }
}
