import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
if(process.platform!=='win32'||process.arch!=='x64')throw new Error('On this OS install cloudflared using its official instructions and set CLOUDFLARED_PATH.');
const info=await fetch('https://api.github.com/repos/cloudflare/cloudflared/releases/latest',{headers:{'user-agent':'Shopora local preview'},signal:AbortSignal.timeout(20000)});
if(!info.ok)throw new Error(`Could not read official cloudflared release (${info.status}).`);
const release=await info.json(),asset=release.assets?.find(item=>item.name==='cloudflared-windows-amd64.exe');
if(!asset?.browser_download_url?.startsWith('https://github.com/cloudflare/cloudflared/releases/download/')||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||''))throw new Error('Official asset or checksum unavailable. No binary was executed.');
const directory=path.resolve('.shopora-preview/tools');await mkdir(directory,{recursive:true});
const target=path.join(directory,'cloudflared.exe');
const valid=bytes=>'sha256:'+createHash('sha256').update(bytes).digest('hex')===asset.digest;
let existing;try{existing=await readFile(target);}catch{}
if(existing){if(!valid(existing))throw new Error('Existing preview binary differs from the current signed release digest. Verify or remove it manually before replacing.');}
else {
 const response=await fetch(asset.browser_download_url,{signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new Error(`Official cloudflared download failed (${response.status}).`);
 const bytes=Buffer.from(await response.arrayBuffer());if(!valid(bytes))throw new Error('Downloaded asset checksum mismatch.');
 await writeFile(target,bytes,{flag:'wx'});
}
console.log(`Verified Cloudflare release ${release.tag_name}; binary stored only in .shopora-preview/tools.`);
