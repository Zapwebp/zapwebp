'use strict';

const net = require('node:net');
const dns = require('node:dns');

/**
 * Checks whether an IP address belongs to a private, loopback, link-local,
 * or carrier-grade NAT network range.
 *
 * @param {string} hostname - IP address or hostname to evaluate
 * @returns {boolean} True if the address is private or restricted
 */
function isPrivateIpSync(hostname) {
  if (!hostname) return true;
  const host = String(hostname).toLowerCase().trim().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'broadcasthost' ||
    host === '0.0.0.0'
  ) {
    return true;
  }

  // IPv4 check
  if (net.isIPv4(host)) {
    const parts = host.split('.').map(Number);
    const [a, b] = parts;
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 127) return true; // 127.0.0.0/8 Loopback
    if (a === 10) return true; // 10.0.0.0/8 Private Network
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 Private Network
    if (a === 192 && b === 168) return true; // 192.168.0.0/16 Private Network
    if (a === 169 && b === 254) return true; // 169.254.0.0/16 Link-local / Cloud Metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 Carrier-grade NAT
    return false;
  }

  // IPv6 check
  if (net.isIPv6(host)) {
    if (host === '::1' || host === '::') return true;
    if (
      host.startsWith('fe80:') ||
      host.startsWith('fe90:') ||
      host.startsWith('fea0:') ||
      host.startsWith('feb0:')
    ) {
      return true; // fe80::/10 Link-local
    }
    if (host.startsWith('fc') || host.startsWith('fd')) return true; // fc00::/7 Unique Local
    if (host.startsWith('::ffff:')) {
      const v4part = host.slice(7);
      if (net.isIPv4(v4part)) {
        return isPrivateIpSync(v4part);
      }
    }
    return false;
  }

  return false;
}

/**
 * Checks whether an IP address or hostname belongs to a private network.
 * Resolves domain names via dns.promises.lookup to defend against DNS rebinding SSRF.
 *
 * @param {string} hostname - Hostname or IP to inspect
 * @returns {Promise<boolean>|boolean}
 */
async function isPrivateIp(hostname) {
  if (isPrivateIpSync(hostname)) return true;
  if (net.isIP(hostname)) return false;

  try {
    const lookup = await dns.promises.lookup(hostname);
    if (lookup && lookup.address) {
      return isPrivateIpSync(lookup.address);
    }
  } catch {
    return false;
  }

  return false;
}

// Bind sync inspection to isPrivateIp.sync
isPrivateIp.sync = isPrivateIpSync;

/**
 * Validates a remote image URL to protect against SSRF and protocol smuggling.
 * @param {string} urlStr - Remote URL to inspect
 * @returns {Promise<URL>|URL} Parsed URL instance if valid and safe
 * @throws {Error} Throws error with code 'E_UNSAFE_URL' if unsafe
 */
function validateSafeUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    const err = new Error(`Invalid URL format: "${urlStr}"`);
    err.code = 'E_UNSAFE_URL';
    throw err;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    const err = new Error(`Unsupported URL protocol "${parsed.protocol}". Only HTTP and HTTPS are permitted.`);
    err.code = 'E_UNSAFE_URL';
    throw err;
  }

  if (isPrivateIpSync(parsed.hostname)) {
    const err = new Error(`Access to private, loopback, or link-local network address "${parsed.hostname}" is forbidden.`);
    err.code = 'E_UNSAFE_URL';
    throw err;
  }

  return parsed;
}

/**
 * Validates a remote URL asynchronously with DNS rebinding resolution.
 * @param {string} urlStr
 * @returns {Promise<URL>}
 */
async function validateSafeUrlAsync(urlStr) {
  const parsed = validateSafeUrl(urlStr);
  const isPrivate = await isPrivateIp(parsed.hostname);
  if (isPrivate) {
    const err = new Error(`Access to private, loopback, or link-local network address "${parsed.hostname}" is forbidden.`);
    err.code = 'E_UNSAFE_URL';
    throw err;
  }
  return parsed;
}

/**
 * Safe fetch wrapper that enforces SSRF defense, DNS rebinding validation,
 * and passes redirect: 'error' to prevent redirect-based SSRF exfiltration.
 *
 * @param {string|URL} url - URL to fetch
 * @param {RequestInit} [options={}] - Fetch options
 * @returns {Promise<Response>}
 */
async function safeFetch(url, options = {}) {
  const urlStr = typeof url === 'string' ? url : url.toString();
  await validateSafeUrlAsync(urlStr);
  return fetch(urlStr, {
    ...options,
    redirect: 'error',
    signal: options.signal || AbortSignal.timeout(10000),
  });
}

module.exports = {
  isPrivateIp,
  isPrivateIpSync,
  validateSafeUrl,
  validateSafeUrlAsync,
  safeFetch,
};
