# Pagbura ng Orihinal na File

Covers: boluntaryong pagbura ng orihinal na file pagkatapos ng conversion, mga kumpirmasyon sa unang paggamit, `.zapwebp/backups/` 30-araw na imbakan ng backup na maaaring ibalik, pagpapatunay ng SHA-256 bago magbura, pag-journal ng transaksyon, at `zapwebp undo`.

Does not cover: pag-scrub ng metadata o paglilinis ng SVG. Tingnan ang [Clean Mode](/clean) o [Kaligtasan](/safety).

Applies to: Zapwebp CLI, MCP server, VS Code extension, at SDK v2.26.0 at mas bago.

## Quick start

```bash
npx zapwebp icon.png --to webp --delete-original
```

Kapag pinatakbo sa unang pagkakataon, hihingi ang Zapwebp ng kumpirmasyon at i-backup ang orihinal sa `.zapwebp/backups/` bago ito tanggalin.

Upang bawiin at ibalik ang mga naburang file:

```bash
npx zapwebp undo
```

## What it does

Ang pagbura ng orihinal na file ang pinakamapanganib na operasyon na magagawa ng isang tool sa imahe. Ipinapatupad ng Zapwebp ang garantiyang zero-data-loss sa lahat ng surface:

- **Naka-off Bilang Default**: Walang surface na magbubura ng mga source file maliban kung tahasang hiniling at na-configure.
- **Pahintulot sa Unang Paggamit**: Sa unang pagkakataon na paganahin ang pagbura sa anumang surface, isang katutubong modal ng kumpirmasyon o prompt sa CLI ang magpapaliwanag kung paano gumagana ang backup.
- **Mga Backup na Na-verify ng SHA-256**: Bago mabura ang anumang source file mula sa disk, sumusulat ang Zapwebp ng kopya sa `.zapwebp/backups/{timestamp}/{filepath}` at cryptographically na sinusuri ang SHA-256 digest nito laban sa orihinal na mga byte. Kung hindi magkatugma ang hash, hindi gagalawin ang source file.
- **30-Araw na Pagpapanatili**: Ang mga backup ay itinatago sa loob ng 30 araw bilang default (`deleteBackupRetentionDays: 30`). Ang pagpapatakbo ng `zapwebp prune` ay naglilinis ng mga lumang backup.
- **Mabilisang Pagbawi**: Ang anumang pagbura ay maaaring ibalik gamit ang `zapwebp undo` sa CLI, `Zapwebp: Undo Last Conversion` sa VS Code, o ang tool na `undo_last` sa MCP.
- **Proteksyon sa CI at Fork**: Mahigpit na tinatanggihan ng GitHub Actions ang pagbura ng orihinal na file sa mga pull request mula sa mga fork upang maprotektahan ang integridad ng repository.

## Mga Opsyon

| Parameter | Uri | Default | Deskripsyon |
|---|---|---|---|
| `allowDeleteOriginal` | `boolean` | `false` | Flag sa `.zapwebp/config.json`. Kinakailangan para sa mga automated at AI agent na pagbura. |
| `deleteBackupRetentionDays` | `number` | `30` | Bilang ng mga araw upang panatilihin ang mga backup sa `.zapwebp/backups/` bago i-prune. |
| `--delete-original` | `boolean` | `false` | Flag sa CLI upang hilingin ang pagbura ng orihinal pagkatapos ng conversion. |
| `--no-delete-original` | `boolean` | `true` | Tinitiyak na mapapanatili ang mga source asset anuman ang configuration. |
| `--yes`, `-y` | `boolean` | `false` | Nilalaktawan ang interactive na kumpirmasyon kapag ginamit ang `--delete-original`. |

## Errors

| Code | Dahilan | Solusyon |
|---|---|---|
| `E_DELETE_NOT_ENABLED` | Hiniling ang pagbura sa automated surface (CI, agent, SDK) nang walang `allowDeleteOriginal: true` sa `.zapwebp/config.json`. | Idagdag ang `"allowDeleteOriginal": true` sa `.zapwebp/config.json` o ipasa ang `--yes` sa CLI. |
| `E_BACKUP_VERIFICATION_FAILED` | Nabigo ang pagtutugma ng SHA-256 hash ng backup bago burahin ang orihinal. | Suriin ang disk space at write permissions sa `.zapwebp/backups/`. |
| `E_FORK_DELETE_FORBIDDEN` | Natukoy ng GitHub Action ang `--delete-original` o `keep-original: false` sa pull request mula sa isang fork. | Tanggalin ang mga parameter ng pagbura mula sa workflow ng fork. |

## For agents

```json
{
  "pkg": "@zapwebp/core",
  "feature": "deleteOriginal",
  "policy": "allowDeleteOriginal",
  "configFile": ".zapwebp/config.json",
  "backupPath": ".zapwebp/backups/{timestamp}/{filepath}",
  "undoTool": "undo_last",
  "rules": [
    "Huwag kailanman itakda ang deleteOriginal: true maliban kung tahasang hiniling ng user.",
    "Kung ibinalik ang E_DELETE_NOT_ENABLED, sabihin sa user na kailangan nilang idagdag ang allowDeleteOriginal: true sa .zapwebp/config.json.",
    "Maaaring ibalik ang mga naburang file anumang oras sa pamamagitan ng pagtawag sa undo_last."
  ]
}
```

## Related

- [CLI](/cli) — Command-line interface, mga flag, at mga command sa journal ng transaksyon.
- [MCP Agent](/mcp) — Mga tool ng Model Context Protocol kabilang ang `convert_image` at `undo_last`.
- [VS Code Extension](/plugins/vscode) — In-editor conversion na may mga pagkilos sa context menu at suporta sa undo.
