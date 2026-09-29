import {generate} from './core.mjs';
import {publish} from './publish.mjs';
const [command,...args]=process.argv.slice(2);
try {
  if (command==='generate') await generate({sample:args.includes('--sample')});
  else if (command==='publish') await publish(args[0], args[1] || 'both');
  else throw new Error('Usage: node src/cli.mjs generate [--sample] | publish DRAFT_ID [both|linkedin|instagram]');
} catch (error) {console.error(error.message); process.exitCode=1;}
