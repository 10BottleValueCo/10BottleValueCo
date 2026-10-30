<?php
defined('ABSPATH') || exit;

/**
 * Legacy Supabase -> WooCommerce migration.
 *
 * Exit codes: 0 = clean; 1 = fatal (nothing or only already-committed rows were
 * written); 2 = finished with conflicts/blocked/rejected/failed rows (import) or
 * mismatches (reconcile).
 */
final class TBV_LM_CLI
{
    /**
     * Import a normalized export.
     *
     * ## OPTIONS
     *
     * <export>
     * : Path to the tbv-supabase-export v1 JSON file.
     *
     * [--dry-run]
     * : Validate and plan only. Writes nothing (no tables, no run log).
     *
     * [--accept-changes=<entities>]
     * : Comma-separated entities (or "all") whose changed source rows may overwrite
     * already-imported destination records. Prior versions are kept as revisions.
     *
     * [--format=<format>]
     * : table or json.
     * ---
     * default: table
     * options:
     *   - table
     *   - json
     * ---
     *
     * [--report=<path>]
     * : Also write the JSON report to this path.
     *
     * ## EXAMPLES
     *
     *     wp tbv-migrate import export.json --dry-run
     *     wp tbv-migrate import export.json --report=import-report.json
     */
    public function import($args, $assoc)
    {
        try {
            $export = TBV_LM_Export::load($args[0]);
            $accept = isset($assoc['accept-changes']) ? array_filter(array_map('trim', explode(',', (string) $assoc['accept-changes']))) : [];
            $importer = new TBV_LM_Importer($export, ['dry_run' => !empty($assoc['dry-run']), 'accept_changes' => array_values($accept)]);
            $report = $importer->run();
        } catch (TBV_LM_Export_Exception | TBV_LM_Fatal $e) {
            WP_CLI::error($e->getMessage());
            return;
        }
        $this->emit($report, $assoc);
        $bad = 0;
        foreach (['conflict', 'blocked', 'rejected', 'failed'] as $k) {
            $bad += $report['totals'][$k] ?? 0;
        }
        if (($assoc['format'] ?? 'table') !== 'json') {
            $bad ? WP_CLI::warning($bad . ' row(s) need review (see issues).') : WP_CLI::success($report['mode'] === 'dry-run' ? 'Dry run complete; nothing written.' : 'Import complete.');
        }
        WP_CLI::halt($bad ? 2 : 0);
    }

    /**
     * Compare the export with what is in WordPress/WooCommerce.
     *
     * ## OPTIONS
     *
     * <export>
     * : Path to the tbv-supabase-export v1 JSON file.
     *
     * [--format=<format>]
     * : table or json.
     * ---
     * default: table
     * options:
     *   - table
     *   - json
     * ---
     *
     * [--report=<path>]
     * : Also write the JSON report to this path.
     */
    public function reconcile($args, $assoc)
    {
        try {
            $export = TBV_LM_Export::load($args[0]);
            $report = (new TBV_LM_Reconciler($export))->run();
        } catch (TBV_LM_Export_Exception | TBV_LM_Fatal $e) {
            WP_CLI::error($e->getMessage());
            return;
        }
        if (!empty($assoc['report'])) {
            file_put_contents($assoc['report'], wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
        if (($assoc['format'] ?? 'table') === 'json') {
            WP_CLI::line(wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        } else {
            $rows = [];
            foreach ($report['entities'] as $entity => $e) {
                $cents = [];
                foreach ($e['cents'] as $field => $pair) {
                    $cents[] = $field . ' ' . TBV_LM_Util::money($pair['source']) . ' / ' . TBV_LM_Util::money($pair['destination']);
                }
                $rows[] = [
                    'entity' => $entity, 'source' => $e['source_count'], 'destination' => $e['destination_count'],
                    'matched' => $e['matched'], 'mismatched' => $e['mismatched'], 'missing' => $e['missing_in_destination'],
                    'extra' => $e['extra_in_destination'], 'cents (source / destination)' => implode('; ', $cents),
                ];
            }
            WP_CLI\Utils\format_items('table', $rows, array_keys($rows[0]));
            if ($report['mismatches']) {
                $m = array_map(function ($x) {
                    return ['entity' => $x['entity'], 'key' => $x['key'], 'field' => $x['field'],
                        'source' => is_scalar($x['source']) || $x['source'] === null ? var_export($x['source'], true) : wp_json_encode($x['source']),
                        'destination' => is_scalar($x['destination']) || $x['destination'] === null ? var_export($x['destination'], true) : wp_json_encode($x['destination']),
                        'reason' => $x['reason']];
                }, $report['mismatches']);
                WP_CLI\Utils\format_items('table', $m, ['entity', 'key', 'field', 'source', 'destination', 'reason']);
                WP_CLI::warning(count($report['mismatches']) . ' mismatch(es).');
            } else {
                WP_CLI::success('Source and destination match exactly.');
            }
        }
        WP_CLI::halt($report['ok'] ? 0 : 2);
    }

    /**
     * Show recent runs and whether the migration lock is free.
     */
    public function status($args, $assoc)
    {
        global $wpdb;
        if (!TBV_LM_Schema::exists()) {
            WP_CLI::line('No migration tables yet.');
            return;
        }
        $runs = $wpdb->get_results('SELECT id, status, export_sha256, started_at, finished_at FROM ' . TBV_LM_Schema::table('runs') . ' ORDER BY id DESC LIMIT 20', ARRAY_A);
        if ($runs) {
            WP_CLI\Utils\format_items('table', $runs, ['id', 'status', 'export_sha256', 'started_at', 'finished_at']);
        }
        $free = (string) $wpdb->get_var("SELECT IS_FREE_LOCK('tbv_legacy_migration')") === '1';
        WP_CLI::line('Lock: ' . ($free ? 'free' : 'held by a running process'));
    }

    /**
     * Create or upgrade the migration tables.
     */
    public function install($args, $assoc)
    {
        TBV_LM_Schema::install();
        WP_CLI::success('Migration tables ready.');
    }

    private function emit(array $report, array $assoc): void
    {
        if (!empty($assoc['report'])) {
            file_put_contents($assoc['report'], wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }
        if (($assoc['format'] ?? 'table') === 'json') {
            WP_CLI::line(wp_json_encode($report, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            return;
        }
        $cols = ['created', 'would_create', 'unchanged', 'updated', 'would_update', 'conflict', 'blocked', 'rejected', 'failed'];
        $rows = [];
        foreach ($report['entities'] as $entity => $counts) {
            $row = ['entity' => $entity];
            foreach ($cols as $c) {
                $row[$c] = $counts[$c] ?? 0;
            }
            $rows[] = $row;
        }
        WP_CLI::line(sprintf('%s run %s, export sha256 %s', $report['mode'], $report['run_id'] ?? '-', $report['export_sha256']));
        if ($report['resumed_after_interrupted_runs']) {
            WP_CLI::line('Resumed after interrupted run(s): ' . implode(', ', $report['resumed_after_interrupted_runs']));
        }
        WP_CLI\Utils\format_items('table', $rows, array_merge(['entity'], $cols));
        if ($report['issues']) {
            WP_CLI\Utils\format_items('table', $report['issues'], ['entity', 'key', 'outcome', 'code', 'message']);
        }
        if ($report['warnings']) {
            WP_CLI\Utils\format_items('table', $report['warnings'], ['entity', 'key', 'code', 'message']);
        }
        if ($report['missing_from_source']) {
            WP_CLI::line(count($report['missing_from_source']) . ' previously imported row(s) are absent from this export (kept, not deleted).');
        }
        if ($report['relinked']) {
            WP_CLI::line($report['relinked'] . ' preserved record(s) linked to newly imported customers.');
        }
    }
}
