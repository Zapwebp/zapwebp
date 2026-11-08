'use strict';

const net = require('node:net');

/**
 * Checks whether an IP address or hostname belongs to a private, loopback,
 * link-local, or cloud metadata network range (SSRF defense).
 *
 * Enforces Zero Trust Principle:
 * Private subnets, loopback (127.0.0.0/8, ::1), link-local (169.254.0.0/16, fe80::/10),
 * and private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7) are rejected.
 *
 * @param {string} hostname - IP address or hostname to check
 * @returns {boolean} True if the address is private / restricted
 */
function isPrivateIp(hostname) {
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
        return isPrivateIp(v4part);
      }
    }
    return false;
  }

  return false;
}

/**
 * Validates a remote image URL to protect against SSRF and protocol smuggling.
 * @param {string} urlStr - Remote URL to inspect
 * @returns {URL} Parsed URL instance if valid and safe
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

  if (isPrivateIp(parsed.hostname)) {
    const err = new Error(`Access to private, loopback, or link-local network address "${parsed.hostname}" is forbidden.`);
    err.code = 'E_UNSAFE_URL';
    throw err;
  }

  return parsed;
}

module.exports = {
  isPrivateIp,
  validateSafeUrl,
};

