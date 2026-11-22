# Original File Deletion

Covers: opt-in original file deletion after conversion, first-time consent flows, `.zapwebp/backups/` 30-day reversible backup storage, SHA-256 pre-deletion verification, transaction journaling, and `zapwebp undo`.

Does not cover: metadata scrubbing or SVG sanitization. See [Clean Mode](/clean) or [Safety](/safety).

Applies to: Zapwebp CLI, MCP server, VS Code extension, and SDK v2.26.0 and later.

## Quick start

```bash
npx zapwebp icon.png --to webp --delete-original
```

When run for the first time, Zapwebp prompts for confirmation and backs up the original to `.zapwebp/backups/` before unlinking.

To undo and restore deleted files:

```bash
npx zapwebp undo
```

## What it does

Deleting original files is the most destructive operation an image tool can perform. Zapwebp enforces a zero-data-loss guarantee across all surfaces:

- **Off by Default**: No surface ever deletes source files unless explicitly requested and configured.
- **First-Time Consent**: The first time deletion is activated on any surface, a native confirmation modal or interactive CLI prompt explains the backup mechanics.
- **SHA-256 Verified Backups**: Before any source file is deleted from disk, Zapwebp writes a copy to `.zapwebp/backups/{timestamp}/{filepath}` and cryptographically verifies its SHA-256 digest against the original bytes. If the hash does not match, the source file is never touched.
- **30-Day Retention**: Backups are kept for 30 days by default (`deleteBackupRetentionDays: 30`). Running `zapwebp prune` cleans up expired backup trees.
- **Single-Command Reversibility**: Any deletion can be instantly undone using `zapwebp undo` in the CLI, `Zapwebp: Undo Last Conversion` in VS Code, or the `undo_last` tool in MCP.
- **CI & Fork Protection**: GitHub Actions and automated CI pipelines strictly refuse original file deletion on pull requests from forks to protect repository integrity.

## Options

| Parameter | Type | Default | Description |
|---|---|---|---|
| `allowDeleteOriginal` | `boolean` | `false` | Workspace opt-in flag in `.zapwebp/config.json`. Required for non-interactive and AI agent deletion. |
| `deleteBackupRetentionDays` | `number` | `30` | Number of days to retain backups in `.zapwebp/backups/` before automated pruning. |
| `--delete-original` | `boolean` | `false` | CLI flag to request original file deletion upon successful conversion. |
| `--no-delete-original` | `boolean` | `true` | CLI flag ensuring source assets are preserved regardless of project configuration. |
| `--yes`, `-y` | `boolean` | `false` | Bypasses interactive confirmation when `--delete-original` is passed. |

## Errors

| Code | Cause | Fix |
|---|---|---|
| `E_DELETE_NOT_ENABLED` | Deletion was requested on a non-interactive surface (CI, agent, SDK) without `allowDeleteOriginal: true` in `.zapwebp/config.json`. | Add `"allowDeleteOriginal": true` to `.zapwebp/config.json` or pass `--yes` in CLI. |
| `E_BACKUP_VERIFICATION_FAILED` | The backup file SHA-256 digest failed to match the original source file bytes prior to unlinking. | Check available disk space and filesystem write permissions in `.zapwebp/backups/`. |
| `E_FORK_DELETE_FORBIDDEN` | GitHub Action detected `--delete-original` or `keep-original: false` on a pull request from a forked repository. | Remove deletion parameters from fork workflows to maintain repository security. |

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
    "Never set deleteOriginal: true unless the user explicitly requests source deletion in prompt.",
    "If E_DELETE_NOT_ENABLED is returned, inform the user they must add allowDeleteOriginal: true to .zapwebp/config.json.",
    "Deleted files can be restored anytime by calling undo_last."
  ]
}
```

## Related

- [CLI](/cli) — Command-line interface, flags, and transaction journal commands.
- [MCP Agent](/mcp) — Model Context Protocol tools including `convert_image` and `undo_last`.
- [VS Code Extension](/plugins/vscode) — In-editor conversion with context menu actions and undo support.
