<?php
declare(strict_types=1);
// Staging only: this reads a local price feed; it never runs a refresh or accepts a path.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');
header('X-Content-Type-Options: nosniff');
$ids = ['8410261112121','8410261112008','8410261101071','8410261101118','9100300200467','3222477739123','8015920372498','9100300001170'];
function checkedFeed(string $file, array $ids, bool $requireLive): ?array {
    if (!is_readable($file) || filesize($file) > 16384) { return null; }
    $raw = file_get_contents($file);
    if ($raw === false) { return null; }
    $doc = json_decode($raw, true);
    if (!is_array($doc) || !is_string($doc['updatedAt'] ?? null)) { return null; }
    $ts = strtotime($doc['updatedAt']);
    if ($ts === false || $ts > time() + 300) { return null; }
    if ($requireLive && (($doc['stats']['verified'] ?? 0) !== count($ids) || ($doc['checked']['glovo'] ?? false) !== true || ($doc['checked']['woltStores'] ?? 0) < 1)) { return null; }
    foreach ($ids as $id) {
        $price = $doc['prices'][$id]['current'] ?? '';
        if (!is_string($price) || !preg_match('/^[0-9]+,[0-9]{2}₾$/u', $price)) { return null; }
    }
    return [$raw, $ts];
}
$seed = checkedFeed(__DIR__ . '/prices.json', $ids, false);
$live = checkedFeed(dirname(__DIR__, 2) . '/.sparspirits-jobs/prices.live.json', $ids, true);
if ($live !== null && ($seed === null || $live[1] >= $seed[1])) {
    header('X-SPAR-Price-Source: scheduled');
    echo $live[0];
} elseif ($seed !== null) {
    header('X-SPAR-Price-Source: snapshot');
    echo $seed[0];
} else {
    http_response_code(503);
    echo '{"error":"prices unavailable"}';
}
