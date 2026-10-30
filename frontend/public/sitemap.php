<?php
declare(strict_types=1);

header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: public, max-age=3600');

$siteUrl = 'https://bergrentacar.com';
$locales = ['tr', 'en', 'de', 'ru'];
$defaultLocale = 'tr';
$apiBase = 'https://berg.saastour360.com/api';
$tenantId = '9930c947-f720-463c-ba1d-e1af921d5ffb';
$cacheFile = __DIR__ . '/sitemap.cache.xml';
$cacheTtl = 3600;

$staticPages = [
  ['path' => '/', 'changefreq' => 'daily', 'priority' => '1.0'],
  ['path' => '/destinations', 'changefreq' => 'weekly', 'priority' => '0.8'],
  ['path' => '/contact-us', 'changefreq' => 'monthly', 'priority' => '0.6'],
  ['path' => '/faq', 'changefreq' => 'monthly', 'priority' => '0.5'],
  ['path' => '/help-center', 'changefreq' => 'monthly', 'priority' => '0.5'],
  ['path' => '/company-info', 'changefreq' => 'monthly', 'priority' => '0.5'],
  ['path' => '/aydinlatma-metni', 'changefreq' => 'yearly', 'priority' => '0.3'],
  ['path' => '/cerez-aydinlatma-politikasi', 'changefreq' => 'yearly', 'priority' => '0.3'],
  ['path' => '/kvk-politikasi', 'changefreq' => 'yearly', 'priority' => '0.3'],
  ['path' => '/yonetim-bilgi-sistemleri-politikasi', 'changefreq' => 'yearly', 'priority' => '0.3'],
];

if (is_file($cacheFile) && (time() - filemtime($cacheFile)) < $cacheTtl) {
  readfile($cacheFile);
  exit;
}

function http_get(string $url): ?string {
  if (function_exists('curl_init')) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_TIMEOUT => 20,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_USERAGENT => 'BergRentACar-Sitemap/1.0',
    ]);
    $body = curl_exec($ch);
    $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body !== false && $code >= 200 && $code < 300) {
      return $body;
    }
    return null;
  }

  $ctx = stream_context_create(['http' => ['timeout' => 20, 'header' => "Accept: application/json\r\n"]]);
  $body = @file_get_contents($url, false, $ctx);
  return $body === false ? null : $body;
}

function parse_list($payload): array {
  if (!is_array($payload)) {
    return [];
  }
  foreach (['data', 'items', 'destinations', 'blogs'] as $key) {
    if (isset($payload[$key]) && is_array($payload[$key])) {
      return $payload[$key];
    }
  }
  if ($payload === [] || array_keys($payload) === range(0, count($payload) - 1)) {
    return $payload;
  }
  return [];
}

function xml_escape(string $value): string {
  return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
}

function to_date(?string $value): ?string {
  if (!$value) {
    return null;
  }
  $ts = strtotime($value);
  return $ts ? date('Y-m-d', $ts) : null;
}

function locale_url(string $siteUrl, string $locale, string $routePath): string {
  $clean = $routePath === '/' ? '' : rtrim($routePath, '/');
  return $siteUrl . '/' . $locale . $clean;
}

function translation_for(array $item, string $locale, ?string $languageId): ?array {
  $translations = $item['translations'] ?? [];
  if (!is_array($translations)) {
    return null;
  }
  foreach ($translations as $tr) {
    $code = strtolower((string) ($tr['language']['code'] ?? ''));
    if ($code === $locale) {
      return $tr;
    }
  }
  foreach ($translations as $tr) {
    if (($tr['languageId'] ?? null) === $languageId || ($tr['language']['id'] ?? null) === $languageId) {
      return $tr;
    }
  }
  return null;
}

function destination_slug(array $item, string $locale, ?string $languageId): ?string {
  $tr = translation_for($item, $locale, $languageId);
  $slug = trim((string) ($tr['slug'] ?? ''));
  return $slug !== '' ? $slug : null;
}

function blog_slug(array $item, string $locale, ?string $languageId): ?string {
  $tr = translation_for($item, $locale, $languageId);
  if (!$tr) {
    return null;
  }
  $slug = trim((string) ($tr['slug'] ?? ''));
  if ($slug !== '') {
    return $slug;
  }
  $parsed = json_decode((string) ($tr['value'] ?? ''), true);
  $fromValue = trim((string) ($parsed['slug'] ?? ''));
  return $fromValue !== '' ? $fromValue : null;
}

function merge_entry(array &$map, array $item, string $locale, ?string $slug): void {
  if (!$slug) {
    return;
  }
  $id = (string) ($item['id'] ?? '');
  if ($id === '') {
    return;
  }
  if (!isset($map[$id])) {
    $map[$id] = ['slugs' => [], 'lastmod' => null];
  }
  $map[$id]['slugs'][$locale] = $slug;
  $lastmod = to_date($item['updatedAt'] ?? $item['publishedAt'] ?? $item['createdAt'] ?? null);
  if ($lastmod && ($map[$id]['lastmod'] === null || $lastmod > $map[$id]['lastmod'])) {
    $map[$id]['lastmod'] = $lastmod;
  }
}

function url_entry(string $loc, ?string $lastmod, string $changefreq, string $priority, array $alternates, array $locales, string $defaultLocale): string {
  $links = [];
  foreach ($locales as $code) {
    if (!empty($alternates[$code])) {
      $links[] = '    <xhtml:link rel="alternate" hreflang="' . $code . '" href="' . xml_escape($alternates[$code]) . '" />';
    }
  }
  $defaultHref = $alternates[$defaultLocale] ?? (array_values($alternates)[0] ?? null);
  if ($defaultHref) {
    $links[] = '    <xhtml:link rel="alternate" hreflang="x-default" href="' . xml_escape($defaultHref) . '" />';
  }
  $lastmodLine = $lastmod ? "    <lastmod>{$lastmod}</lastmod>\n" : '';
  return "  <url>\n    <loc>" . xml_escape($loc) . "</loc>\n{$lastmodLine}    <changefreq>{$changefreq}</changefreq>\n    <priority>{$priority}</priority>\n" . implode("\n", $links) . "\n  </url>";
}

$languageIds = [];
$langsJson = http_get($apiBase . '/languages?tenantId=' . urlencode($tenantId));
if ($langsJson) {
  foreach (parse_list(json_decode($langsJson, true)) as $lang) {
    if (($lang['isActive'] ?? true) === false) {
      continue;
    }
    $code = strtolower((string) ($lang['code'] ?? ''));
    if (in_array($code, $locales, true) && !empty($lang['id'])) {
      $languageIds[$code] = $lang['id'];
    }
  }
}

$destinations = [];
$blogs = [];

foreach ($locales as $locale) {
  $languageId = $languageIds[$locale] ?? null;
  if (!$languageId) {
    continue;
  }

  $destJson = http_get($apiBase . '/destinations?tenantId=' . urlencode($tenantId) . '&languageId=' . urlencode($languageId));
  if ($destJson) {
    foreach (parse_list(json_decode($destJson, true)) as $item) {
      if (($item['isActive'] ?? true) === false) {
        continue;
      }
      merge_entry($destinations, $item, $locale, destination_slug($item, $locale, $languageId));
    }
  }

  $blogJson = http_get($apiBase . '/blogs?tenantId=' . urlencode($tenantId) . '&languageId=' . urlencode($languageId));
  if ($blogJson) {
    foreach (parse_list(json_decode($blogJson, true)) as $item) {
      $status = $item['status'] ?? 'published';
      if ($status && $status !== 'published') {
        continue;
      }
      merge_entry($blogs, $item, $locale, blog_slug($item, $locale, $languageId));
    }
  }
}

$today = date('Y-m-d');
$urls = [];

foreach ($staticPages as $page) {
  $alternates = [];
  foreach ($locales as $locale) {
    $alternates[$locale] = locale_url($siteUrl, $locale, $page['path']);
  }
  foreach ($locales as $locale) {
    $urls[] = url_entry($alternates[$locale], $today, $page['changefreq'], $page['priority'], $alternates, $locales, $defaultLocale);
  }
}

foreach ($destinations as $entry) {
  $alternates = [];
  foreach ($locales as $locale) {
    if (!empty($entry['slugs'][$locale])) {
      $alternates[$locale] = locale_url($siteUrl, $locale, '/destination/' . $entry['slugs'][$locale]);
    }
  }
  foreach ($locales as $locale) {
    if (empty($alternates[$locale])) {
      continue;
    }
    $urls[] = url_entry($alternates[$locale], $entry['lastmod'] ?? $today, 'weekly', '0.7', $alternates, $locales, $defaultLocale);
  }
}

foreach ($blogs as $entry) {
  $alternates = [];
  foreach ($locales as $locale) {
    if (!empty($entry['slugs'][$locale])) {
      $alternates[$locale] = locale_url($siteUrl, $locale, '/blog/' . $entry['slugs'][$locale]);
    }
  }
  foreach ($locales as $locale) {
    if (empty($alternates[$locale])) {
      continue;
    }
    $urls[] = url_entry($alternates[$locale], $entry['lastmod'] ?? $today, 'weekly', '0.6', $alternates, $locales, $defaultLocale);
  }
}

if (!$urls && is_file($cacheFile)) {
  readfile($cacheFile);
  exit;
}

if (!$urls) {
  foreach ($locales as $locale) {
    $alternates = [];
    foreach ($locales as $code) {
      $alternates[$code] = locale_url($siteUrl, $code, '/');
    }
    $urls[] = url_entry($alternates[$locale], $today, 'daily', '1.0', $alternates, $locales, $defaultLocale);
  }
}

$xml = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"\n        xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n" . implode("\n", $urls) . "\n</urlset>\n";

@file_put_contents($cacheFile, $xml);
echo $xml;
