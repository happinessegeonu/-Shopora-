import { readdir, readFile, writeFile, mkdir, lstat } from "node:fs/promises";
import { deflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
import path from "node:path";
// Explicit allowlist: no Git state, local environments, customer exports, APKs,
// screenshots, node_modules or build output can enter this website handoff.
const roots=["src","public","database","docs","scripts","tests"];
const files=["README.md","package.json","package-lock.json","tsconfig.json","next-env.d.ts","next.config.mjs","eslint.config.mjs","Dockerfile","compose.yaml","railway.json",".env.example",".dockerignore",".gitignore"];
async function walk(directory) {
 for(const entry of await readdir(directory,{withFileTypes:true})) {
  const name=path.posix.join(directory,entry.name);
  if(entry.isSymbolicLink()) throw new Error("Symlinks are not permitted in the handoff");
  if(entry.isDirectory()) await walk(name); else if(entry.isFile()) files.push(name);
 }
}
for(const root of roots) await walk(root);
files.sort();
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let i=0;i<8;i++)c=(c&1)?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const byte of bytes)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
const local=[],central=[];let offset=0;
for(const file of files){
 if(file.split('/').some(part=>part.startsWith('.env')&&part!=='.env.example')) throw new Error("Unexpected environment file");
 if((await lstat(file)).isSymbolicLink()) throw new Error("Unexpected symlink");
 const data=await readFile(file),compressed=deflateRawSync(data),name=Buffer.from(`Shopora-Owned-Auth/${file}`),crc=crc32(data);
 const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x5d67,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
 local.push(header,name,compressed);
 const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt16LE(0x800,8);record.writeUInt16LE(8,10);record.writeUInt16LE(0x5d67,14);record.writeUInt32LE(crc,16);record.writeUInt32LE(compressed.length,20);record.writeUInt32LE(data.length,24);record.writeUInt16LE(name.length,28);record.writeUInt32LE(offset,42);
 central.push(record,name);offset+=header.length+name.length+compressed.length;
}
const index=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
const archive=Buffer.concat([...local,index,end]);
await mkdir("artifacts",{recursive:true});
await writeFile("artifacts/Shopora-Owned-Auth.zip",archive);
await writeFile("artifacts/Shopora-Owned-Auth.zip.sha256",`${createHash("sha256").update(archive).digest("hex")}  Shopora-Owned-Auth.zip\n`);
await writeFile("artifacts/Shopora-Owned-Auth.manifest.txt",files.join("\n")+"\n");
console.log(JSON.stringify({path:path.resolve("artifacts/Shopora-Owned-Auth.zip"),files:files.length,bytes:archive.length}));
