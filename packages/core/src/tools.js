'use strict';

const path = require('node:path');
const fs = require('node:fs');

/**
 * Returns typed MCP-compliant tool definitions for runtime discovery.
 * Can be consumed by MCP servers, AI agents, SDK consumers, and IDE extensions.
 *
 * @returns {Array<{ name: string, description: string, inputSchema: object }>}
 */
function listTools() {
  return [
    {
      name: 'convert_image',
      description: 'Convert an image while preserving transparency and stripping privacy metadata by default.',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Image file path, remote HTTP URL, base64 data, or SVG markup',
          },
          to: {
            type: 'string',
            enum: ['webp', 'avif', 'png', 'jpeg'],
            default: 'webp',
            description: 'Target format',
          },
          quality: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 85,
            description: 'Lossy compression quality (1-100)',
          },
          width: {
            type: 'integer',
            minimum: 1,
            description: 'Target pixel width (aspect ratio preserved if height omitted)',
          },
          height: {
            type: 'integer',
            minimum: 1,
            description: 'Target pixel height',
          },
          clean: {
            type: 'boolean',
            default: true,
            description: 'Strip EXIF, XMP, IPTC, and C2PA metadata',
          },
          lossless: {
            type: 'boolean',
            default: false,
            description: 'Lossless compression mode (for WebP and AVIF)',
          },
          background: {
            type: 'string',
            description: 'Hex background color for opaque targets (e.g. #ffffff)',
          },
          maxOutputBytes: {
            type: 'integer',
            description: 'Strict byte size limit on output',
          },
        },
        required: ['input'],
      },
    },
    {
      name: 'batch_convert',
      description: 'Convert a collection of images concurrently with shared options.',
      inputSchema: {
        type: 'object',
        properties: {
          inputs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Array of file paths, URLs, or image byte buffers',
          },
          to: {
            type: 'string',
            enum: ['webp', 'avif', 'png', 'jpeg'],
            default: 'webp',
          },
          quality: {
            type: 'number',
            default: 85,
          },
          clean: {
            type: 'boolean',
            default: true,
          },
        },
        required: ['inputs'],
      },
    },
    {
      name: 'inspect_image',
      description: 'Inspect image format, dimensions, transparency, chunks, and metadata without re-encoding.',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Image file path, URL, or base64 data',
          },
        },
        required: ['input'],
      },
    },
    {
      name: 'suggest_conversion',
      description: 'Recommend the optimal target format, quality, and dimensions based on image alpha and intended use case.',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Image file path or byte data',
          },
          useCase: {
            type: 'string',
            enum: ['icon', 'hero', 'thumbnail', 'photo', 'general'],
            default: 'general',
            description: 'Intended asset placement context',
          },
        },
        required: ['input'],
      },
    },
    {
      name: 'verify_clean',
      description: 'Verify that an image contains zero residual metadata (EXIF, XMP, GPS, C2PA) and emit verification status.',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Image file path or byte data to audit',
          },
        },
        required: ['input'],
      },
    },
    {
      name: 'verify_alpha',
      description: 'Inspect alpha channel pixels to verify whether an image contains true transparency.',
      inputSchema: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Image file path or byte data',
          },
        },
        required: ['input'],
      },
    },
    {
      name: 'audit_conversion',
      description: 'Audit a shell command (ImageMagick, ffmpeg, cwebp) for transparency loss bugs or security risks.',
      inputSchema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command string (e.g., "convert icon.svg icon.png")',
          },
        },
        required: ['command'],
      },
    },
    {
      name: 'explain_black_background',
      description: 'Explain why an image conversion resulted in an unwanted black background and provide the exact fix.',
      inputSchema: {
        type: 'object',
        properties: {
          sourceFormat: {
            type: 'string',
            description: 'Original input format (e.g. svg, png)',
          },
          targetFormat: {
            type: 'string',
            description: 'Destination format (e.g. jpeg)',
          },
        },
        required: ['sourceFormat', 'targetFormat'],
      },
    },
    {
      name: 'convert_url',
      description: 'Safely fetch an image from a remote URL (with SSRF and private subnet protection) and convert it.',
      inputSchema: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'Remote HTTP/HTTPS image URL',
          },
          to: {
            type: 'string',
            enum: ['webp', 'avif', 'png', 'jpeg'],
            default: 'webp',
          },
          quality: {
            type: 'number',
            default: 85,
          },
        },
        required: ['url'],
      },
    },
  ];
}

/**
 * Loads the static agent.json runtime manifest.
 * @returns {object}
 */
function getAgentManifest() {
  const manifestPath = path.resolve(__dirname, '..', 'agent.json');
  try {
    const raw = fs.readFileSync(manifestPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return {
      name: '@zapwebp/core',
      version: '1.1.1',
      description: 'Zapwebp Core Engine',
      capabilities: ['convert', 'inspect', 'clean', 'verify_alpha', 'audit', 'testing'],
      tools: listTools(),
    };
  }
}

module.exports = {
  listTools,
  getAgentManifest,
};
