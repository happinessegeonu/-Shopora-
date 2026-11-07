import { spawn } from "node:child_process";
import { cp } from "node:fs/promises";
await cp("public",".next/standalone/public",{recursive:true});
await cp(".next/static",".next/standalone/.next/static",{recursive:true});
const port="3148";
const server=spawn(process.execPath,[".next/standalone/server.js"],{env:{...process.env,PORT:port,HOSTNAME:"127.0.0.1",OWNED_AUTH_ENABLED:"false",AUTH_APP_ORIGIN:"https://maketechlimited.com"},stdio:["ignore","pipe","pipe"]});
try {
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error("Standalone test server did not start")),30000);
  server.stdout.on("data",chunk=>{if(chunk.toString().includes("Ready")){clearTimeout(timeout);resolve();}});
  server.once("error",error=>{clearTimeout(timeout);reject(error);});
  server.once("exit",code=>{clearTimeout(timeout);reject(new Error(`Standalone server exited: ${code}`));});
 });
 process.env.SMOKE_BASE_URL=`http://127.0.0.1:${port}`;
 await import("./smoke-local.mjs");
} finally {server.kill();}
