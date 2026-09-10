<?php
// Booking inquiry relay for the Syndicate site. The React form (Home.tsx) POSTs
// JSON here; this calls Brevo's transactional email API server-side so the API
// key never reaches the browser. The key lives in brevo-config.php one level
// above public_html (outside the web root, so it is never served); upload that
// file separately and never commit it.

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed.']);
    exit;
}

$configPath = dirname(__DIR__) . '/brevo-config.php';
$config = is_readable($configPath) ? require $configPath : [];
$apiKey = $config['api_key'] ?? '';
if (!$apiKey) {
    http_response_code(500);
    echo json_encode(['error' => 'Email is not configured. Please email us directly.']);
    exit;
}

$input   = json_decode(file_get_contents('php://input'), true) ?: [];
$name    = trim($input['name'] ?? '');
$email   = trim($input['email'] ?? '');
$details = trim($input['details'] ?? '');

if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $details === '') {
    http_response_code(422);
    echo json_encode(['error' => 'Please add your name, a valid email, and some details.']);
    exit;
}

// ponytail: no spam guard (rate limit / captcha / honeypot). Add one if the
// inbox starts getting hit — a hidden honeypot field is the cheapest.

$rows = [
    'Name'           => $name,
    'Email'          => $email,
    'Event type'     => trim($input['eventType'] ?? ''),
    'Date'           => trim($input['eventDate'] ?? ''),
    'Venue/location' => trim($input['location'] ?? ''),
    'Budget'         => trim($input['budget'] ?? ''),
];
$table = '';
foreach ($rows as $label => $value) {
    if ($value !== '') {
        $table .= '<tr><td style="padding:2px 12px 2px 0"><strong>'
            . htmlspecialchars($label) . '</strong></td><td>'
            . nl2br(htmlspecialchars($value)) . '</td></tr>';
    }
}
$html = '<table>' . $table . '</table>'
    . '<p style="white-space:pre-wrap">' . nl2br(htmlspecialchars($details)) . '</p>';

$payload = [
    'sender'      => ['name' => 'Syndicate site', 'email' => 'bookings@syndicatejazz.com'],
    'to'          => [['email' => 'bookings@syndicatejazz.com']],
    'replyTo'     => ['email' => $email, 'name' => $name],
    'subject'     => 'Booking inquiry — ' . ($rows['Event type'] !== '' ? $rows['Event type'] : 'general'),
    'htmlContent' => $html,
];

$ch = curl_init('https://api.brevo.com/v3/smtp/email');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_HTTPHEADER     => [
        'accept: application/json',
        'content-type: application/json',
        'api-key: ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT    => 15,
]);
$response = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code >= 200 && $code < 300) {
    echo json_encode(['ok' => true]);
} else {
    error_log('send-inquiry.php: Brevo returned ' . $code . ' ' . $response);
    http_response_code(502);
    echo json_encode(['error' => 'Could not send right now. Please email us directly.']);
}
