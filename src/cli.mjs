import {generate} from './core.mjs';
try {
  if (process.argv[2] !== 'generate') throw new Error('Usage: node src/cli.mjs generate [--sample]');
  await generate({sample:process.argv.includes('--sample')});
} catch (error) {console.error(error.message); process.exitCode=1;}
