<?php
defined('ABSPATH') || exit;

/**
 * Maps a historical source line to a catalog variation using catalog identity
 * only: an explicit `migrationKey` (= variation meta _tbv_migration_key) when the
 * export carries one, otherwise the exact tuple
 *   (parent product title, _tbv_dose, _tbv_warehouse, _tbv_pack_size, _tbv_note_label)
 * built from the source item's name, dose, fromWarehouse ("us" or worldwide),
 * vials (default 10) and noteLabel. Comparison is case-insensitive on trimmed
 * strings; there is no fuzzy matching, no SKU/price inference. Zero or several
 * candidates leave the line unmapped (kept as a named line, flagged).
 */
final class TBV_LM_Catalog
{
    private array $by_key = [];
    private array $by_identity = [];

    public static function load(): self
    {
        global $wpdb;
        $c = new self();
        $rows = $wpdb->get_results(
            "SELECT v.ID AS variation_id, v.post_parent AS product_id, p.post_title AS title,
                    mk.meta_value AS mkey, d.meta_value AS dose, w.meta_value AS warehouse,
                    ps.meta_value AS pack, nl.meta_value AS note
             FROM {$wpdb->posts} v
             JOIN {$wpdb->posts} p ON p.ID = v.post_parent
             LEFT JOIN {$wpdb->postmeta} mk ON mk.post_id = v.ID AND mk.meta_key = '_tbv_migration_key'
             LEFT JOIN {$wpdb->postmeta} d  ON d.post_id = v.ID AND d.meta_key = '_tbv_dose'
             LEFT JOIN {$wpdb->postmeta} w  ON w.post_id = v.ID AND w.meta_key = '_tbv_warehouse'
             LEFT JOIN {$wpdb->postmeta} ps ON ps.post_id = v.ID AND ps.meta_key = '_tbv_pack_size'
             LEFT JOIN {$wpdb->postmeta} nl ON nl.post_id = v.ID AND nl.meta_key = '_tbv_note_label'
             WHERE v.post_type = 'product_variation' AND v.post_status <> 'trash'",
            ARRAY_A
        );
        foreach ($rows as $r) {
            $hit = ['product_id' => (int) $r['product_id'], 'variation_id' => (int) $r['variation_id']];
            if ($r['mkey'] !== null && $r['mkey'] !== '') {
                $c->by_key[$r['mkey']][] = $hit;
            }
            $c->by_identity[self::identity($r['title'], $r['dose'], $r['warehouse'], $r['pack'], $r['note'])][] = $hit;
        }
        return $c;
    }

    private static function norm($v): string
    {
        return strtolower(trim(is_scalar($v) ? (string) $v : ''));
    }

    private static function identity($title, $dose, $warehouse, $pack, $note): string
    {
        return implode('|', [self::norm($title), self::norm($dose), self::norm($warehouse), self::norm($pack), self::norm($note)]);
    }

    /** @return array{status:string, product_id:int, variation_id:int} */
    public function match(array $item): array
    {
        $none = ['product_id' => 0, 'variation_id' => 0];
        if (isset($item['migrationKey']) && is_string($item['migrationKey']) && $item['migrationKey'] !== '') {
            $hits = $this->by_key[$item['migrationKey']] ?? [];
            if (count($hits) === 1) {
                return ['status' => 'mapped_by_key'] + $hits[0];
            }
            return ['status' => $hits ? 'ambiguous' : 'key_not_found'] + $none;
        }
        $warehouse = (($item['fromWarehouse'] ?? '') === 'us') ? 'us' : 'worldwide';
        $pack = isset($item['vials']) && is_scalar($item['vials']) ? (string) $item['vials'] : '10';
        $id = self::identity($item['name'] ?? '', $item['dose'] ?? '', $warehouse, $pack, $item['noteLabel'] ?? '');
        $hits = $this->by_identity[$id] ?? [];
        if (count($hits) === 1) {
            return ['status' => 'mapped_by_identity'] + $hits[0];
        }
        return ['status' => $hits ? 'ambiguous' : 'unmapped'] + $none;
    }
}
