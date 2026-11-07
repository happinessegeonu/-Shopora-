import assert from "node:assert/strict";
import { get } from "node:http";
const base=process.env.SMOKE_BASE_URL||"http://127.0.0.1:3147";
if(!["localhost","127.0.0.1"].includes(new URL(base).hostname)) throw new Error("This smoke script is only for the local disabled-auth test server.");
const results=[];
for(const route of ["/","/account","/sell","/checkout","/app","/app-icon-192.png","/robots.txt","/sitemap.xml"]){
 const response=await fetch(`${base}${route}`),body=await response.text();assert.equal(response.status,200,route);assert.ok(body.length>0);results.push({route,status:response.status});
 if(route==="/"){
  const stylesheet=body.match(/href="([^\"]+\.css(?:\?[^\"]*)?)"/)?.[1];assert.ok(stylesheet,"page references production CSS");
  assert.equal((await fetch(new URL(stylesheet,base))).status,200,"standalone CSS exists");
 }
}
const config=await (await fetch(`${base}/api/store/config`)).json();assert.equal(config.owned,true);assert.equal(config.enabled,false);
for(const route of ["/api/health","/api/owned-auth/session","/api/store/cart"]){const response=await fetch(`${base}${route}`);assert.equal(response.status,503,route);results.push({route,status:response.status,expected:"fails closed while disabled"});}
// Use raw HTTP here: Fetch implementations may replace an explicitly set Host.
const www=await new Promise((resolve,reject)=>{get(base,{headers:{Host:"www.maketechlimited.com"}},response=>{response.resume();resolve({status:response.statusCode,location:response.headers.location});}).on("error",reject);});
assert.equal(www.status,308);assert.equal(new URL(www.location).href,"https://maketechlimited.com/");
const attack=await fetch(`${base}/api/owned-auth/login`,{method:"POST",headers:{origin:"https://attacker.example","content-type":"application/json"},body:JSON.stringify({email:"test@example.com",password:"unused"})});assert.equal(attack.status,403);
console.log(JSON.stringify({passed:true,results,wwwRedirect:308,crossOriginLogin:403,productionStylesheet:200}));
