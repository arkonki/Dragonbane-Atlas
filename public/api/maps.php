<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$uploadDir = '../uploads/';
$maps = [];

if (is_dir($uploadDir)) {
    $files = scandir($uploadDir);
    $imageExtensions = ['jpg', 'jpeg', 'png', 'webp'];

    foreach ($files as $file) {
        if ($file === '.' || $file === '..')
            continue;

        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        if (in_array($ext, $imageExtensions)) {
            $path = $uploadDir . $file;
            $maps[] = [
                'id' => $file,
                'name' => pathinfo($file, PATHINFO_FILENAME),
                'url' => '/uploads/' . $file,
                'createdAt' => filemtime($path) * 1000 // Convert to JS milliseconds
            ];
        }
    }
}

// Sort by name for consistency
usort($maps, function ($a, $b) {
    return strcmp($a['name'], $b['name']);
});

echo json_encode($maps);
?>