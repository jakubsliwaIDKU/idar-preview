<?php
/**
 * IDAR — proxy dla Google Places Reviews
 *
 * Wymagane zmienne środowiskowe (lub wpisz wartości bezpośrednio):
 *   GOOGLE_API_KEY   — klucz Places API z Google Cloud Console
 *   GOOGLE_PLACE_ID  — Place ID obiektu (patrz README poniżej)
 *
 * Jak uzyskać Place ID:
 *   1. Wejdź na https://developers.google.com/maps/documentation/places/web-service/place-id
 *   2. Wyszukaj "IDAR Nad Stawami 5A Cieplice" w Place ID Finder
 *   3. Skopiuj ID (wygląda jak: ChIJXxxxxxxxxxxxxxxx)
 *
 * Jak uzyskać klucz API:
 *   1. Google Cloud Console → APIs & Services → Credentials → Create API Key
 *   2. Włącz: Places API (New) lub Places API (Legacy)
 *   3. Ogranicz klucz do swojej domeny (Referrer restriction)
 */

header('Content-Type: application/json; charset=utf-8');
// Na produkcji zamień * na domenę np. 'https://idar.pl'
header('Access-Control-Allow-Origin: *');

$apiKey  = 'WSTAW_KLUCZ_API';   // ← uzupełnij
$placeId = 'ChIJMa6Amr_dDkcReVDWOuh02Iw';    // ← uzupełnij

if ($apiKey === 'WSTAW_KLUCZ_API' || $placeId === 'WSTAW_PLACE_ID') {
    http_response_code(503);
    echo json_encode(['error' => 'API nie jest jeszcze skonfigurowane']);
    exit;
}

$url = 'https://maps.googleapis.com/maps/api/place/details/json?' . http_build_query([
    'place_id'           => $placeId,
    'fields'             => 'reviews,rating,user_ratings_total',
    'reviews_sort'       => 'newest',   // najnowsze
    'reviews_no_translations' => 'false',
    'language'           => 'pl',
    'key'                => $apiKey,
]);

$ctx = stream_context_create([
    'http' => [
        'timeout'       => 6,
        'ignore_errors' => true,
    ]
]);

$raw = @file_get_contents($url, false, $ctx);

if ($raw === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Brak połączenia z Google API']);
    exit;
}

// Proste cache 1h — opcjonalne, zmniejsza liczbę zapytań do API
$cacheFile = sys_get_temp_dir() . '/idar_reviews.json';
$cacheTtl  = 3600;

if ($raw !== false) {
    $data = json_decode($raw, true);
    if (($data['status'] ?? '') === 'OK') {
        file_put_contents($cacheFile, $raw);
    } elseif (file_exists($cacheFile) && time() - filemtime($cacheFile) < $cacheTtl * 24) {
        // Jeśli API zwróciło błąd, serwuj z cache (do doby)
        $raw = file_get_contents($cacheFile);
    }
}

echo $raw;
