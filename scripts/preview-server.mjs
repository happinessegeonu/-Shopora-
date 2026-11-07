import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { createRequire } from 'node:module';
const { demoProducts }=createRequire(import.meta.url)('../src/lib/catalog.ts');
async function freePort() { const server=createServer();await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port; }
export async function startPreview({persistent=true,publicTunnel=false,built=false,port=3037,quiet=false}={}) {
 const directory=path.resolve('.shopora-preview');await mkdir(directory,{recursive:true});
 let code;
 if(persistent){try{code=(await readFile(path.join(directory,'access-code.txt'),'utf8')).trim();}catch{}}
 if(!/^[a-f0-9]{32}$/.test(code||'')) {code=randomBytes(16).toString('hex');if(persistent)await writeFile(path.join(directory,'access-code.txt'),code,{mode:0o600});}
 const db=await PGlite.create(persistent?path.join(directory,'review-data'):undefined);
 for(const name of ['owned-auth.sql','shopora.sql','operations.sql','checkout-requests.sql'])await db.exec(await readFile(new URL(`../database/${name}`,import.meta.url),'utf8'));
 await db.exec(`create table if not exists shopora_preview_messages(id uuid primary key default gen_random_uuid(),recipient text not null,subject text not null,body text not null,created_at timestamptz not null default now());
 create table if not exists shopora_preview_feedback(id uuid primary key default gen_random_uuid(),note text not null,created_at timestamptz not null default now());`);
 for(const product of demoProducts)await db.query("insert into shopora_products(id,name,description,price_minor,category,image_url,badge,color,stock) values($1,$2,$3,$4,$5,$6,$7,$8,20) on conflict(id) do nothing",[product.id,product.name,product.description,product.price_minor,product.category,product.image,product.badge||null,product.color]);
 for(const state of ['Lagos','Abuja','FCT','Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno','Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','Gombe','Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba','Yobe','Zamfara'])await db.query('insert into shopora_shipping_rates(state,fee_minor) values($1,500000) on conflict(state) do nothing',[state]);
 const dbPort=await freePort(); const socket=new PGLiteSocketServer({db,host:'127.0.0.1',port:dbPort,maxConnections:8,inspect:false});await socket.start();
 let tunnel,origin=`http://127.0.0.1:${port}`,web;
 const stop=async()=>{web?.kill();tunnel?.kill();await socket.stop().catch(()=>{});await db.close().catch(()=>{});};
 try {
  const useBuild=publicTunnel||built;
  if(useBuild){
   await cp('public','.next/standalone/public',{recursive:true});
   await cp('.next/static','.next/standalone/.next/static',{recursive:true});
  }
  if(publicTunnel){
   // Only the built standalone HTTP server is exposed, never Next's dev server.
   const configFile=path.join(directory,'quick-tunnel.yml');await writeFile(configFile,'# Deliberately no existing Cloudflare tunnel configuration.\n');
   const executable=process.env.CLOUDFLARED_PATH||path.join(directory,'tools',process.platform==='win32'?'cloudflared.exe':'cloudflared');
   tunnel=spawn(executable,['tunnel','--config',configFile,'--url',origin,'--protocol','http2','--no-autoupdate'],{stdio:['ignore','pipe','pipe'],windowsHide:true});
   origin=await new Promise((resolve,reject)=>{
    let output='';
    const failure=reason=>new Error(`${reason} Use the local preview or follow docs/TEST-PREVIEW.md. ${output.split(/\r?\n/).filter(line=>line.includes('ERR')).slice(-2).join(' ')}`);
    const timeout=setTimeout(()=>reject(failure('Temporary tunnel did not start.')),45000);
    const data=chunk=>{output=(output+chunk.toString()).slice(-12000);const match=output.match(/\|\s+(https:\/\/(?!api\.)[a-z0-9][a-z0-9-]+\.trycloudflare\.com)\s+\|/i);if(match){clearTimeout(timeout);resolve(match[1]);}};
    tunnel.stdout.on('data',data);tunnel.stderr.on('data',data);tunnel.once('error',error=>{clearTimeout(timeout);reject(error);});tunnel.once('exit',()=>{clearTimeout(timeout);reject(failure('Temporary tunnel stopped.'));});
   });
  }
  const env={...process.env};
  for(const name of Object.keys(env))if(/MAILGUN|SUPABASE|GOOGLE|DATABASE_URL|SOURCE_DATABASE|MIGRATION_DATABASE/.test(name))env[name]='';
  Object.assign(env,{NODE_ENV:useBuild?'production':'development',NEXT_TELEMETRY_DISABLED:'1',PORT:String(port),HOSTNAME:'127.0.0.1',SHOPORA_PREVIEW:'true',SHOPORA_PREVIEW_BUILD_DIR:persistent?'.next-preview':'.next-preview-e2e',SHOPORA_PREVIEW_ACCESS_CODE:code,DATABASE_URL:`postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres`,AUTH_DATABASE_URL:'',OWNED_AUTH_ENABLED:'true',SHOPORA_BACKEND:'postgres',AUTH_APP_ORIGIN:origin,AUTH_RATE_SECRET:randomBytes(32).toString('hex'),MAILGUN_API_KEY:'',MAILGUN_DOMAIN:'',MAILGUN_FROM_EMAIL:'',GOOGLE_CLIENT_ID:'',GOOGLE_CLIENT_SECRET:'',ORDER_NOTIFICATION_EMAIL:'owner@example.test',ORDER_REPLY_TO_EMAIL:'support@example.test'});
  web=spawn(process.execPath,useBuild?['.next/standalone/server.js']:['node_modules/next/dist/bin/next','dev','--webpack','--hostname','127.0.0.1','--port',String(port)],{env,stdio:['ignore','pipe','pipe'],windowsHide:true});
  if(!quiet){web.stdout.on('data',data=>process.stdout.write(data));web.stderr.on('data',data=>process.stderr.write(data));}
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('Preview web server did not start.')),60000);web.stdout.on('data',data=>{if(data.toString().includes('Ready')){clearTimeout(timeout);resolve();}});web.once('error',error=>{clearTimeout(timeout);reject(error);});web.once('exit',exit=>{clearTimeout(timeout);reject(new Error(`Preview web process exited (${exit}).`));});});
  if(persistent)await writeFile(path.join(directory,'connection.json'),JSON.stringify({url:origin,code,startedAt:new Date().toISOString(),pid:process.pid},null,2),{mode:0o600});
  if(!quiet)console.log(`\nISOLATED TEST SHOP: ${origin}\nAccess code: ${code}\nSimulated emails and payments; fictional details only. Test inbox/checklist: ${origin}/preview\nKeep this process (and computer) running. Stop with Ctrl+C. No production connection is used.\n`);
  return {origin,code,db,stop};
 }catch(error){await stop();throw error;}
}
