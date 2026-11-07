import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'tests/browser',fullyParallel:false,workers:1,retries:0,timeout:150000,
 expect:{timeout:18000},
 reporter:[['list'],['json',{outputFile:'.shopora-preview/browser-report.json'}]],
 use:{baseURL:process.env.SHOPORA_TEST_BASE_URL,headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||(process.platform==='win32'?'msedge':undefined),viewport:{width:1366,height:900},screenshot:'only-on-failure',trace:'retain-on-failure',actionTimeout:20000,navigationTimeout:50000},
});
