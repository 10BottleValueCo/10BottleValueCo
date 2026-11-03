<?php
defined('ABSPATH') || exit;

/**
 * Pure helpers: exact money handling, canonical hashing, timestamps.
 * Money is always handled as integer cents. Source numeric(10,2) values may
 * arrive as JSON numbers or strings; anything that is not an exact cent value
 * is rejected instead of rounded.
 */
final class TBV_LM_Util
{
    /** @return int|null cents, or null when the value is not an exact cent amount */
    public static function cents($value): ?int
    {
        if (is_int($value)) {
            return $value * 100;
        }
        if (is_string($value)) {
            $v = trim($value);
            if (!preg_match('/^(-?)(\d{1,13})(?:\.(\d{1,2}))?$/', $v, $m)) {
                // Accept trailing zeros beyond two decimals (e.g. "12.500") but nothing else.
                if (preg_match('/^(-?)(\d{1,13})\.(\d{2})0+$/', $v, $m2)) {
                    $m = $m2;
                } else {
                    return null;
                }
            }
            $c = (int) $m[2] * 100 + (int) str_pad($m[3] ?? '0', 2, '0');
            return $m[1] === '-' ? -$c : $c;
        }
        if (is_float($value)) {
            if (!is_finite($value) || abs($value) > 1e13) {
                return null;
            }
            $scaled = $value * 100;
            $rounded = round($scaled);
            if (abs($scaled - $rounded) > 1e-6) {
                return null;
            }
            return (int) $rounded;
        }
        return null;
    }

    /** Integer-cents columns (bigint in the source). Accepts ints and integral strings only. */
    public static function int_cents($value): ?int
    {
        if (is_int($value)) {
            return $value;
        }
        if (is_string($value) && preg_match('/^-?\d{1,16}$/', trim($value))) {
            return (int) trim($value);
        }
        if (is_float($value) && is_finite($value) && floor($value) === $value && abs($value) < 9007199254740992) {
            return (int) $value;
        }
        return null;
    }

    public static function money(int $cents): string
    {
        $sign = $cents < 0 ? '-' : '';
        $abs = abs($cents);
        return sprintf('%s%d.%02d', $sign, intdiv($abs, 100), $abs % 100);
    }

    public static function is_list($value): bool
    {
        return is_array($value) && array_is_list($value);
    }

    public static function canonical($value)
    {
        if (is_array($value)) {
            if (!array_is_list($value)) {
                ksort($value, SORT_STRING);
            }
            foreach ($value as $k => $v) {
                $value[$k] = self::canonical($v);
            }
        }
        return $value;
    }

    public static function canonical_json($value): string
    {
        return json_encode(
            self::canonical($value),
            JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR
        );
    }

    public static function hash($value): string
    {
        return hash('sha256', self::canonical_json($value));
    }

    /** @return int|null unix timestamp for an ISO-8601/Postgres timestamptz string */
    public static function timestamp($value): ?int
    {
        if (!is_string($value) || trim($value) === '') {
            return null;
        }
        $v = trim($value);
        // Postgres emits "2026-03-14 18:22:05.123456+00" as well as ISO "T" form.
        if (!preg_match('/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}(:?\d{2})?)$/', $v)) {
            return null;
        }
        if (preg_match('/[+-]\d{2}$/', $v)) {
            $v .= ':00';
        }
        try {
            return (new DateTimeImmutable($v))->getTimestamp();
        } catch (Exception $e) {
            return null;
        }
    }

    public static function is_uuid($value): bool
    {
        return is_string($value) && (bool) preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value);
    }

    public static function norm_email($value): string
    {
        return is_string($value) ? strtolower(trim($value)) : '';
    }

    public static function norm_code($value): string
    {
        return is_string($value) ? strtoupper(trim($value)) : '';
    }

    public static function gmt_mysql(int $ts): string
    {
        return gmdate('Y-m-d H:i:s', $ts);
    }

    /**
     * Fault injection for interruption tests only. Requires both an explicit
     * environment opt-in and a non-production WordPress environment.
     */
    public static function fault(string $point, string $key): void
    {
        $spec = getenv('TBV_LM_FAULT');
        if (!$spec || getenv('TBV_LM_ALLOW_FAULTS') !== '1' || wp_get_environment_type() === 'production') {
            return;
        }
        if ($spec === $point . ':' . $key || $spec === $point . ':*') {
            if (function_exists('posix_kill') && function_exists('posix_getpid')) {
                posix_kill(posix_getpid(), 9); // SIGKILL: no shutdown handlers, no COMMIT.
            }
            exit(137);
        }
    }
}
