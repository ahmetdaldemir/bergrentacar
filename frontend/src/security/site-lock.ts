const ALLOWED_HOSTS = new Set(['bergrentacar.com', 'www.bergrentacar.com']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const LOCAL_PORT = '8080';

function stop(message: string): never {
  const root = document.documentElement;
  root.replaceChildren();
  const body = document.createElement('body');
  const paragraph = document.createElement('p');
  paragraph.textContent = message;
  body.append(paragraph);
  root.append(body);
  throw new Error('site-locked');
}

async function domainIsPublished(): Promise<'ok' | 'missing' | 'unknown'> {
  try {
    const response = await fetch(
      'https://cloudflare-dns.com/dns-query?name=bergrentacar.com&type=A',
      { headers: { accept: 'application/dns-json' } },
    );
    if (!response.ok) return 'unknown';
    const data = (await response.json()) as { Status?: number; Answer?: unknown[] };
    if (data.Status === 3) return 'missing';
    if (data.Status === 0 && Array.isArray(data.Answer) && data.Answer.length > 0) return 'ok';
    if (data.Status === 0) return 'missing';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function isAllowedPage(): boolean {
  const host = window.location.hostname.toLowerCase();
  if (ALLOWED_HOSTS.has(host)) return true;
  return LOCAL_HOSTS.has(host) && window.location.port === LOCAL_PORT;
}

/** Refuse to render unless the page is bergrentacar.com, or localhost on port 8080, and the domain is still published. */
export async function enforceBergrentacarHost(): Promise<void> {
  if (!isAllowedPage()) {
    stop('Bu site yalnızca bergrentacar.com veya http://localhost:8080 üzerinde açılır.');
  }

  const published = await domainIsPublished();
  if (published === 'missing') {
    stop('bergrentacar.com yayında değil. Site açılmıyor.');
  }
  if (published !== 'ok') {
    stop('bergrentacar.com doğrulanamadı. Site açılmıyor.');
  }
}
