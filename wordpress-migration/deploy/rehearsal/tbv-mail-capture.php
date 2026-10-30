<?php
/**
 * Plugin Name: Rehearsal mail capture
 * Description: LOCAL REHEARSAL ONLY. Writes outgoing mail to logs/mail-capture.jsonl instead of sending it.
 */
defined('ABSPATH') || exit;
add_filter('pre_wp_mail', function ($return, $atts) {
    if ($return !== null || empty($atts['to'])) return $return; // already decided (e.g. staging blocks mail), or a probe
    $line = wp_json_encode(['to' => $atts['to'] ?? '', 'subject' => (string)($atts['subject'] ?? ''), 'message' => (string)($atts['message'] ?? ''), 'at' => gmdate('c')]);
    file_put_contents(dirname(ABSPATH) . '/logs/mail-capture.jsonl', $line . "\n", FILE_APPEND | LOCK_EX);
    return true;
}, 10, 2);
