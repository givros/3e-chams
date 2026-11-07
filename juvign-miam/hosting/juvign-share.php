<?php
declare(strict_types=1);

const MAX_REQUEST = 8 * 1024 * 1024;

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

if (!is_dir($directory) && !@mkdir($directory, 0700) && !is_dir($directory)) {
    respond(503, ['error' => 'Le service de partage est indisponible.']);
}
$lock = @fopen($directory . '/.lock', 'c');
if (!$lock || !flock($lock, LOCK_EX)) {
    respond(503, ['error' => 'Le service de partage est indisponible.']);
}
function readRequest(): string {
    $body = file_get_contents('php://input', false, null, 0, MAX_REQUEST + 1);
    if ($body === false || strlen($body) > MAX_REQUEST) {
        respond(413, ['error' => 'Ce fragment est trop volumineux.']);
    }
    return $body;
}
function storeFragment(string $file, string $body, int $offset): void {
    $handle = @fopen($file, 'c+b');
    if (!$handle || fseek($handle, $offset) !== 0) {
        respond(503, ['error' => 'Impossible d’enregistrer cette application.']);
    }
    $length = strlen($body);
    if (fwrite($handle, $body) !== $length || !fflush($handle)) {
        ftruncate($handle, $offset);
        respond(507, ['error' => 'Le serveur manque d’espace. Ton application peut toujours être exportée.']);
    }
    fclose($handle);
}

$operation = $_GET['upload'] ?? '';
if ($operation === 'start') {
    foreach (glob($directory . '/upload-*.tmp') ?: [] as $old) {
        if (filemtime($old) < time() - 86400) {
            @unlink($old);
        }
    }
    $token = bin2hex(random_bytes(16));
    storeFragment($directory . '/upload-' . $token . '.tmp', '', 0);
    respond(201, ['token' => $token]);
}

if ($operation !== '') {
    $token = $_GET['token'] ?? '';
    if (!is_string($token) || !preg_match('/^[a-f0-9]{32}$/D', $token)) {
        respond(400, ['error' => 'Transfert invalide.']);
    }
    $temp = $directory . '/upload-' . $token . '.tmp';
    if (!is_file($temp)) {
        respond(404, ['error' => 'Transfert introuvable. Relance le partage.']);
    }
    if ($operation === 'cancel') {
        @unlink($temp);
        respond(200, ['cancelled' => true]);
    }
    $offset = filter_var($_GET['offset'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
    if ($offset === false || filesize($temp) !== $offset) {
        respond(409, ['error' => 'Transfert incomplet. Relance le partage.']);
    }
    if ($operation === 'chunk') {
        $body = readRequest();
        storeFragment($temp, $body, $offset);
        respond(200, ['offset' => $offset + strlen($body)]);
    }
    if ($operation !== 'finish' || $offset === 0) {
        respond(400, ['error' => 'Transfert invalide.']);
    }
} else {
    $body = readRequest();
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
    $temp = $directory . '/upload-' . bin2hex(random_bytes(16)) . '.tmp';
    storeFragment($temp, $body, 0);
}

$digest = hash_file('sha256', $temp);
$id = $slug;
for ($suffix = 2; is_file($directory . '/' . $id . '.json'); $suffix++) {
    if (hash_file('sha256', $directory . '/' . $id . '.json') === $digest) {
        @unlink($temp);
        respond(200, ['id' => $id]);
    }
    $id = $slug . '-' . $suffix;
}
if (!@rename($temp, $directory . '/' . $id . '.json')) {
    respond(503, ['error' => 'Impossible d’enregistrer cette application.']);
}
respond(201, ['id' => $id]);
