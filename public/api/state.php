<?php
/**
 * Simple JSON file storage backend.
 * Place this in a PHP-enabled server to test the HttpAdapter.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$file = __DIR__ . '/state.json';

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
  if (!file_exists($file)) {
    echo json_encode(null);
    exit;
  }
  readfile($file);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $data = file_get_contents('php://input');
  
  if (empty($data)) {
      http_response_code(400);
      echo json_encode(['error' => 'No data received']);
      exit;
  }

  // Verify it's valid JSON before saving (basic usage protection)
  $decoded = json_decode($data);
  if ($decoded === null) {
      http_response_code(400);
      echo json_encode(['error' => 'Invalid JSON']);
      exit;
  }

  // Atomic write capability using lock
  if (file_put_contents($file, $data, LOCK_EX) === false) {
      http_response_code(500);
      echo json_encode(['error' => 'Failed to write file']);
      exit;
  }
  
  echo json_encode(['ok' => true]);
  exit;
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
