<?php
//ini_set('display_errors', 1);
//ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

define('_JEXEC', 1);
define('JPATH_BASE', '/var/www/html/');

require_once JPATH_BASE . '/includes/defines.php';
require_once JPATH_BASE . '/includes/framework.php';

$app = JFactory::getApplication('site');
$user = JFactory::getUser();

if ($user->get('guest')) {
    $cookieName = 'joomla_remember_me_' . JUserHelper::getShortHashedUserAgent();
    if ($app->input->cookie->get($cookieName)) {
        $app->login(array('username' => ''), array('silent' => true));
        $user = JFactory::getUser();
    }
}

$joomlaId = (int)$user->get('id');
if (!$joomlaId) {
    http_response_code(401);
    echo json_encode(array('error' => 'not_logged_in'));
    exit;
}

$token = getenv('VITE_ORTHANC_TOKEN');

if (!$token) {
    http_response_code(500);
    echo json_encode(array('error' => 'missing_token'));
    exit;
}

$url = 'https://api.eosfrontier.space/orthanc/v2/chars_player/';
$headers = array(
    'accountID: ' . $joomlaId,
    'token: ' . $token
);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

if ($response === false) {
    $err = curl_error($ch);
    curl_close($ch);
    http_response_code(502);
    echo json_encode(array('error' => 'upstream_error', 'details' => $err));
    exit;
}

curl_close($ch);
http_response_code($httpCode ? $httpCode : 200);
echo $response;
?>
