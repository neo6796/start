<?php
/**
 * adiumentum.sk — spracovanie kontaktného formulára.
 *
 * Voliteľný súbor. Použite ho, ak hosting podporuje PHP (Webglobe áno).
 * V súbore kontakt.html potom nastavte formuláru action="odoslat.php".
 * Bez tohto súboru formulár otvorí návštevníkovi e-mailový program.
 */
declare(strict_types=1);

// --- Nastavenie ------------------------------------------------------------

/** Kam sa dopyty doručia. Môže ich byť viac, oddelené čiarkou. */
$prijemca = 'adiumentum01@gmail.com';

/**
 * Odosielateľ musí byť adresa na vlastnej doméne, inak správu vyhodnotí
 * Gmail ako podvrh a zahodí ju. Schránku netreba čítať, stačí, že existuje —
 * vytvoríte ju v administrácii Webglobe.
 */
$odosielatel = 'web@adiumentum.sk';

// --- Spracovanie -----------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'chyba' => 'Nepodporovaná metóda.'], JSON_UNESCAPED_UNICODE);
    exit;
}

// Pasca na roboty: skryté pole vyplní iba automat. Tvárime sa, že sme prijali.
if (!empty($_POST['webova-adresa'])) {
    echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
    exit;
}

/** Načíta pole formulára, oreže biele znaky a obmedzí dĺžku. */
function pole(string $kluc, int $max): string
{
    $hodnota = $_POST[$kluc] ?? '';
    if (!is_string($hodnota)) {
        return '';
    }
    return mb_substr(trim($hodnota), 0, $max);
}

/** Odstráni zlomy riadkov — bez toho by sa dali do hlavičiek prepašovať ďalšie. */
function bezZlomov(string $hodnota): string
{
    return str_replace(["\r", "\n", '%0a', '%0d'], ' ', $hodnota);
}

$meno    = pole('meno', 120);
$email   = pole('email', 190);
$telefon = pole('telefon', 60);
$org     = pole('organizacia', 160);
$sluzba  = pole('sluzba', 160);
$sprava  = pole('sprava', 5000);
$suhlas  = !empty($_POST['suhlas']);

$chyby = [];
if ($meno === '')   { $chyby[] = 'meno'; }
if ($sprava === '') { $chyby[] = 'sprava'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $chyby[] = 'email'; }
if (!$suhlas)       { $chyby[] = 'suhlas'; }

if ($chyby !== []) {
    http_response_code(422);
    echo json_encode(
        ['ok' => false, 'chyba' => 'Chýbajúce alebo neplatné údaje.', 'polia' => $chyby],
        JSON_UNESCAPED_UNICODE
    );
    exit;
}

$predmet = bezZlomov('Dopyt z webu — ' . ($sluzba !== '' ? $sluzba : 'všeobecný'));

$telo = implode("\n", [
    'Meno:        ' . $meno,
    'Organizácia: ' . ($org !== '' ? $org : '—'),
    'E-mail:      ' . $email,
    'Telefón:     ' . ($telefon !== '' ? $telefon : '—'),
    'Oblasť:      ' . ($sluzba !== '' ? $sluzba : '—'),
    '',
    'Správa:',
    $sprava,
    '',
    '---',
    'Odoslané z webu ' . bezZlomov((string) ($_SERVER['HTTP_HOST'] ?? 'adiumentum.sk'))
        . ' dňa ' . date('j. n. Y') . ' o ' . date('H:i') . '.',
]);

$hlavicky = implode("\r\n", [
    'From: Web adiumentum.sk <' . $odosielatel . '>',
    'Reply-To: ' . bezZlomov($meno) . ' <' . bezZlomov($email) . '>',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
]);

$odoslane = @mail(
    $prijemca,
    '=?UTF-8?B?' . base64_encode($predmet) . '?=',
    $telo,
    $hlavicky,
    '-f' . $odosielatel
);

if (!$odoslane) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'chyba' => 'Správu sa nepodarilo odoslať.'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
