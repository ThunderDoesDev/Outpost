# Outpost

Discord bot for an **Alpha tribe** workflow on ARK clusters. It works for both **ARK: Survival Evolved (ASE)** and **ARK: Survival Ascended (ASA)**.

Slash commands, MySQL-backed guild configuration, forum threads, tribe registry, points, warnings and offences policy, announcements, automatic daily rewards, and a live leaderboard.

Built with [discord.js](https://discord.js.org/) v14 and [mysql2](https://github.com/sidorares/node-mysql2).

## Prerequisites

- **Node.js** (LTS recommended)
- **MySQL** the bot can reach
- A **Discord application** with a bot token. In the [Discord Developer Portal](https://discord.com/developers/applications), enable the [gateway intents](https://discord.com/developers/docs/topics/gateway#gateway-intents) that match how you run the bot. `Bot.js` requests a broad set (including privileged `GuildMembers`, `GuildPresences`, and `MessageContent`); enable the ones you need for your server.

## Quick start

```bash
npm install
```

Copy [`settings/config.example.json`](./settings/config.example.json) to `settings/config.json` (this path is gitignored; do not commit secrets) and fill in your values.

| Field | Purpose |
| --- | --- |
| `bot.token` | Discord bot token |
| `bot.id` | Discord application / bot user ID |
| `bot.name` | Display name used in footers and branding |
| `bot.embedColor` | Default embed color (hex) |
| `bot.developer` | Your Discord user ID, or an array of IDs, for developer-only behavior and maintenance bypass |
| `bot.maintenanceMode` | When `true`, non-developers get a maintenance response (except guilds listed in `ourGuilds` when in a server) |
| `bot.ourGuilds` | Guild IDs that may still use commands during maintenance |
| `database.host` | MySQL host |
| `database.port` | MySQL port (default `3306`) |
| `database.username` | MySQL user |
| `database.password` | MySQL password |
| `database.dbName` | Database name (for example `outpost`) |

Start the bot:

```bash
npm run bot
```

On Windows you can also run `start.bat`, which runs `node Bot.js`.

On startup, the database layer creates and migrates required tables (`clients`, `guild_configs`, Alpha tribe, member, thread, and photo tables, etc.). Slash commands are registered with Discord when the client becomes ready (`Events/Client/ClientReady.js`). The daily reward scheduler also starts then and grants points to active tribes at each guild's configured local time.

## Slash commands (overview)

Commands under a folder are exposed as **`/foldername subcommand`**, where the folder name is lowercased (for example [`Commands/Tribe/`](./Commands/Tribe/) becomes `/tribe`). Root-level files in [`Commands/`](./Commands/) become top-level commands.

Most Alpha management commands require **Administrator** or the configured **Alpha manager** role. `/configuration` commands require **Manage Guild**.

| Command | Purpose |
| --- | --- |
| `/configuration setup` | Forum, public logs, announcements, leaderboard channels, Alpha manager role, optional admin command log channel |
| `/configuration view` | Show current guild configuration, including daily reward status |
| `/configuration daily-reward` | Enable, disable, or inspect automatic daily points for all active tribes (time, timezone, amount) |
| `/configuration disconnect` | Remove Alpha integration from the server |
| `/tribe register` | Register a tribe (owner, map, base spot, and base photos). New tribes start with 20 points |
| `/tribe modify` · `/tribe remove` | Update registry data, or remove a tribe claim |
| `/tribe info` · `/tribe policy` · `/tribe warnings` · `/tribe offences` | Tribe details, policy summary, warning progress, offence record |
| `/members add` · `/members remove` | Add or remove tribe members (Xbox GT / IGN on add) |
| `/points add` | Award points (raided online/offline, won event, or other) |
| `/points remove` | Remove points (including policy offences) |
| `/warnings add` · `/warnings remove` · `/warnings view` · `/warnings all` | Manage or inspect global warning thresholds / policy |
| `/offences add` · `/offences remove` · `/offences view` · `/offences all` | Configure offence types and inspect counts |
| `/leaderboard` | Alpha points leaderboard |
| `/announce` | Post to the configured announcements channel |
| `/help` | Command list and usage |
| `/botinfo` | Bot statistics and runtime info |

Options and permission checks live under [`Commands/`](./Commands/).

## Project layout

| Path | Purpose |
| --- | --- |
| [`Bot.js`](./Bot.js) | Client bootstrap, intents, login |
| [`Commands/`](./Commands/) | Slash command modules (folder = command group) |
| [`Events/`](./Events/) | Discord event handlers (`Client`, `Interactions`, `Messages`, …) |
| [`Utils/Handlers.js`](./Utils/Handlers.js) | Command and event loading; slash registration |
| [`Utils/Database/`](./Utils/Database/) | Connection pool, schema setup, models |
| [`Utils/Alpha/`](./Utils/Alpha/) | Alpha-specific helpers (permissions, leaderboard, threads, photos, policy, daily rewards) |
| [`settings/config.example.json`](./settings/config.example.json) | Example config (copy to `config.json`) |
| [`settings/config.json`](./settings/config.json) | Local config (not in git) |

## Scripts

| Script | Command |
| --- | --- |
| `bot` · `dev` · `start` | `node Bot.js` |

## License

MIT — see [`LICENSE`](./LICENSE).
