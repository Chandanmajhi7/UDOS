// Loads the workspace-root .env regardless of the invoking project's cwd — Nx's
// per-project jest executor sets cwd to the project directory, so a plain
// `dotenv/config` (which only reads process.cwd()) is not reliable here.
const { config } = require('dotenv');
const { resolve } = require('path');

config({ path: resolve(__dirname, '.env') });
