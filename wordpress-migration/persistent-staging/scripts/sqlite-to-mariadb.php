<?php
// Copy the dated v17 synthetic preview snapshot (SQLite) into the staging MariaDB
// schema created by the same WordPress/WooCommerce versions. Idempotent: each
// copied table is truncated first. Staging-only; refuses non-staging databases.
if ($argc < 3) { fwrite(STDERR, "usage: php sqlite-to-mariadb.php SNAPSHOT.sqlite SECRETS.php\n"); exit(2); }
[$_, $snapshot, $secretsFile] = $argv;
$s = require $secretsFile;
if (!preg_match('/^tbv_(staging|migration_test)$/', $s['DB_NAME'])) { fwrite(STDERR, "refusing non-staging database\n"); exit(3); }
$src = new PDO('sqlite:' . $snapshot, null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$dst = new PDO('mysql:host=127.0.0.1;dbname=' . $s['DB_NAME'] . ';charset=utf8mb4', $s['DB_USER'], $s['DB_PASSWORD'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
$dst->exec('SET FOREIGN_KEY_CHECKS=0'); $dst->exec("SET SESSION sql_mode='NO_AUTO_VALUE_ON_ZERO'");
$tables = $src->query("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'wp\\_%' ESCAPE '\\' ORDER BY name")->fetchAll(PDO::FETCH_COLUMN);
$report = [];
foreach ($tables as $t) {
    $exists = $dst->query('SHOW TABLES LIKE ' . $dst->quote($t))->fetchColumn();
    if (!$exists) { $report[$t] = 'MISSING_IN_DESTINATION'; continue; }
    $dcols = $dst->query("SHOW COLUMNS FROM `$t`")->fetchAll(PDO::FETCH_COLUMN);
    $scols = array_column($src->query("PRAGMA table_info(`$t`)")->fetchAll(PDO::FETCH_ASSOC), 'name');
    $cols = array_values(array_intersect($scols, $dcols));
    $dropped = array_values(array_diff($scols, $dcols));
    $dst->exec("TRUNCATE TABLE `$t`");
    $rows = $src->query('SELECT ' . implode(',', array_map(fn($c) => "\"$c\"", $cols)) . " FROM \"$t\"");
    $ins = $dst->prepare("INSERT INTO `$t` (" . implode(',', array_map(fn($c) => "`$c`", $cols)) . ') VALUES (' . rtrim(str_repeat('?,', count($cols)), ',') . ')');
    $n = 0; $dst->beginTransaction();
    foreach ($rows as $r) { $ins->execute(array_values($r)); $n++; }
    $dst->commit();
    $srcCount = (int)$src->query("SELECT COUNT(*) FROM \"$t\"")->fetchColumn();
    $dstCount = (int)$dst->query("SELECT COUNT(*) FROM `$t`")->fetchColumn();
    $report[$t] = ['rows' => $n, 'match' => $srcCount === $dstCount, 'droppedColumns' => $dropped];
}
echo json_encode($report, JSON_PRETTY_PRINT), "\n";
