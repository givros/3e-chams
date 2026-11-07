<?php
declare(strict_types=1);

const MAX_PROJECT = 8 * 1024 * 1024;
const MAX_STORAGE = 256 * 1024 * 1024;
const MAX_SHARES = 2000;

function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Vary: Origin');
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = in_array($origin, ['https://givros.github.io', 'https://givros-studio.fr'], true)
    || preg_match('~^http://(?:127\.0\.0\.1|localhost|\[::1\]):[0-9]+$~D', $origin);
if ($allowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'OPTIONS' && $allowed) {
    http_response_code(204);
    exit;
}
$directory = dirname(__DIR__) . '/.juvign-shares';
function validSlug($slug): bool {
    return is_string($slug) && preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/D', $slug) && strlen($slug) <= 72;
}

if ($method === 'GET') {
    $opening = array_key_exists('open', $_GET);
    $id = $opening ? $_GET['open'] : ($_GET['id'] ?? '');
    if (!validSlug($id)) {
        respond(400, ['error' => 'Identifiant de partage invalide.']);
    }
    $file = $directory . '/' . $id . '.json';
    if (!is_file($file)) {
        respond(404, ['error' => 'Ce lien de partage est introuvable.']);
    }
    if ($opening) {
        header('Location: https://givros.github.io/3e-chams/view.html?s=' . rawurlencode($id), true, 302);
        exit;
    }
    readfile($file);
    exit;
}

if ($method !== 'POST' || !$allowed) {
    respond(403, ['error' => 'Publication non autorisée depuis cette adresse.']);
}

$slug = $_GET['name'] ?? '';
if (!validSlug($slug) || strlen($slug) > 60) {
    respond(400, ['error' => 'Nom de lien invalide.']);
}

$body = file_get_contents('php://input', false, null, 0, MAX_PROJECT + 1);
if ($body === false || strlen($body) > MAX_PROJECT) {
    respond(413, ['error' => 'Le projet dépasse 8 Mo. Réduis la taille des images ou exporte en HTML.']);
}
try {
    $project = json_decode($body, true, 64, JSON_THROW_ON_ERROR);
} catch (JsonException $error) {
    respond(400, ['error' => 'Le projet est illisible.']);
}
if (($project['version'] ?? null) !== 3 || !is_string($project['name'] ?? null)
    || !is_array($project['screens'] ?? null) || !$project['screens']
    || !is_array($project['variables'] ?? null)) {
    respond(400, ['error' => 'Projet de studio invalide.']);
}

if (!is_dir($directory) && !@mkdir($directory, 0700) && !is_dir($directory)) {
    respond(503, ['error' => 'Le service de partage est indisponible.']);
}
$lock = @fopen($directory . '/.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) {
    respond(503, ['error' => 'Le service de partage est indisponible.']);
}
$id = $slug;
for ($suffix = 2; is_file($directory . '/' . $id . '.json'); $suffix++) {
    if (file_get_contents($directory . '/' . $id . '.json') === $body) {
        respond(200, ['id' => $id]);
    }
    $id = $slug . '-' . $suffix;
}

$files = glob($directory . '/*.json');
$used = 0;
foreach ($files ?: [] as $file) {
    $used += filesize($file) ?: 0;
}
if (count($files ?: []) >= MAX_SHARES || $used + strlen($body) > MAX_STORAGE) {
    respond(507, ['error' => 'L’espace de partage est plein. Tu peux exporter ton application en HTML.']);
}

$temp = $directory . '/' . $id . '.tmp';
if (@file_put_contents($temp, $body) !== strlen($body) || !@rename($temp, $directory . '/' . $id . '.json')) {
    @unlink($temp);
    respond(503, ['error' => 'Impossible d’enregistrer cette application.']);
}
flock($lock, LOCK_UN);
fclose($lock);
respond(201, ['id' => $id]);
