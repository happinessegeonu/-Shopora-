import { startPreview } from './preview-server.mjs';
const preview=await startPreview({publicTunnel:process.argv.includes('--public'),port:Number(process.env.SHOPORA_PREVIEW_PORT||3037)});
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await preview.stop();process.exit(0);}
process.once('SIGINT',stop);process.once('SIGTERM',stop);
