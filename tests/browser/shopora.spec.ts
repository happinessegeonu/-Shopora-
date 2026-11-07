import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
const origin=process.env.SHOPORA_TEST_BASE_URL!;
const code=process.env.SHOPORA_TEST_ACCESS_CODE!;
const password='synthetic review passphrase 382';
const newPassword='new synthetic review passphrase 473';
const address=(prefix:string)=>`${prefix}-${randomUUID().slice(0,8)}@example.test`;
const headers={origin};
const post=(page:Page,url:string,data:unknown,extra:Record<string,string>={})=>page.request.post(url,{data,headers:{...headers,...extra}});
async function unlock(page:Page,wrong=false){
 await page.goto('/');await expect(page.getByRole('heading',{name:'Try Shopora safely.'})).toBeVisible();
 if(wrong){await page.getByLabel('Preview access code').fill('wrong');await page.getByRole('button',{name:'Open test shop'}).click();await expect(page.locator('main').getByRole('alert')).toContainText('incorrect');}
 await page.getByLabel('Preview access code').fill(code);await page.getByRole('button',{name:'Open test shop'}).click();await expect(page).toHaveURL(/\/preview$/);
}
async function inbox(page:Page,email:string){
 const response=await page.request.get(`/api/preview/inbox?email=${encodeURIComponent(email)}`);expect(response.status()).toBe(200);
 const result=await response.json();expect(result.simulated).toBe(true);return result.data as {subject:string;body:string}[];
}
async function emailLink(page:Page,email:string,subject:string){
 const messages=await inbox(page,email);const body=messages.find(item=>item.subject.includes(subject))?.body;
 expect(body,'simulated mailbox contains the requested message').toBeTruthy();
 const link=body!.match(/https?:\/\/[^\s]+/)?.[0];expect(link).toBeTruthy();expect(new URL(link!).origin).toBe(origin);return link!;
}
async function requestSignup(page:Page,email:string){
 await page.goto('/account');await page.getByRole('button',{name:'Create account / resend link'}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByRole('button',{name:'Send email link'}).click();await expect(page.getByRole('status')).toContainText('email has been requested');
}
async function choosePassword(page:Page,link:string,chosen=password,invalid=false){
 await page.goto(link);await expect(page.getByRole('heading',{name:'Choose your password'})).toBeVisible();await expect(page).toHaveURL(/\/account$/);
 await page.getByLabel('Password',{exact:true}).fill(chosen);await page.getByLabel('Confirm password',{exact:true}).fill(invalid?newPassword:chosen);
 await page.getByRole('button',{name:'Save password'}).click();
 if(invalid){await expect(page.getByRole('status')).toContainText('Passwords must match');await page.getByLabel('Confirm password',{exact:true}).fill(chosen);await page.getByRole('button',{name:'Save password'}).click();}
 await expect(page.getByRole('status')).toContainText('Password saved');
}
async function signIn(page:Page,email:string,chosen=password,success=true){
 await page.goto('/account');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('Password',{exact:true}).fill(chosen);await page.getByRole('button',{name:'Sign in',exact:true}).click();
 if(success)await expect(page.getByText(`Signed in as ${email}`,{exact:true})).toBeVisible();else await expect(page.getByRole('status')).toContainText('incorrect');
}
async function createAccount(page:Page,email:string){await requestSignup(page,email);await choosePassword(page,await emailLink(page,email,'Verify your test account'));await signIn(page,email);}
async function session(page:Page){const response=await page.request.get('/api/owned-auth/session');expect(response.status()).toBe(200);return (await response.json()).user;}
const checkout=(email:string,productId:string)=>({email,senderName:'Synthetic Customer',senderPhone:'08000000001',receiverName:'Synthetic Customer',receiverPhone:'08000000001',location:'Test City',state:'Lagos',address:'1 Fictional Road',items:[{productId,quantity:1}]});

test('registration, verification, resend, login/logout, session reload and password reset in the browser',async({page,browser})=>{
 expect((await page.request.get('/api/preview/inbox?email=example@example.test')).status()).toBe(401);
 await unlock(page,true); const email=address('account');
 expect((await post(page,'/api/owned-auth/register',{email:'outside@example.com'})).status()).toBe(400);
 await requestSignup(page,email);const old=await emailLink(page,email,'Verify your test account');
 expect((await post(page,'/api/owned-auth/login',{email,password})).status()).toBe(401);
 expect((await post(page,'/api/owned-auth/resend',{email})).status()).toBe(200);
 const latest=await emailLink(page,email,'Verify your test account');expect(latest).not.toBe(old);
 const oldToken=new URLSearchParams(new URL(old).hash.slice(1)).get('token');
 expect((await post(page,'/api/owned-auth/verify',{token:oldToken,password})).status()).toBe(400);
 await choosePassword(page,latest,password,true);
 await signIn(page,email,'incorrect synthetic password',false);await signIn(page,email);
 const original=await session(page);expect(original.email).toBe(email);expect(original.password_hash).toBeUndefined();
 await page.reload();await expect(page.getByText(`Signed in as ${email}`,{exact:true})).toBeVisible();
 const secondary=await browser.newContext({baseURL:origin});const other=await secondary.newPage();
 try{
  await unlock(other);await signIn(other,email);expect((await session(other)).id).toBe(original.id);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('status')).toContainText('Signed out');expect(await session(page)).toBeNull();expect((await session(other)).id).toBe(original.id);
  await page.getByRole('button',{name:'Forgot password?'}).click();await page.getByLabel('Email',{exact:true}).fill(email);await page.getByRole('button',{name:'Send email link'}).click();await expect(page.getByRole('status')).toContainText('email has been requested');
  const reset=await emailLink(page,email,'Reset your test password');await choosePassword(page,reset,newPassword);expect(await session(other)).toBeNull();
  const token=new URLSearchParams(new URL(reset).hash.slice(1)).get('token');expect((await post(page,'/api/owned-auth/reset',{token,password:newPassword})).status()).toBe(400);
  await signIn(page,email,password,false);await signIn(page,email,newPassword);expect((await session(page)).id).toBe(original.id);
  expect((await post(page,'/api/owned-auth/logout',{}, {origin:'https://external.example'})).status()).toBe(403);expect((await session(page)).id).toBe(original.id);
 }finally{await secondary.close();}
});

test('desktop catalogue search/filter/sort, synchronized bag, checkout retry, emails and private order history',async({page,browser})=>{
 await unlock(page);const email=address('customer');await createAccount(page,email);await page.goto('/');
 const cards=page.locator('.product-card'),search=page.getByRole('textbox',{name:'Search products'});
 await expect(page.getByText(/Cart sync active/)).toBeVisible();
 await search.fill('Selena');await expect(cards).toHaveCount(1);await expect(cards.first()).toContainText('Selena');
 await search.fill('not-a-real-product');await expect(page.getByText(/No products match yet/)).toBeVisible();await page.getByRole('button',{name:'Clear filters'}).click();await expect(cards.first()).toBeVisible();
 await page.getByRole('button',{name:'Perfumes',exact:true}).click();await expect(cards.first().locator('.product-meta p')).toHaveText('Perfumes');
 expect((await cards.locator('.product-meta p').allTextContents()).every(value=>value==='Perfumes')).toBe(true);
 for(const sort of ['low','high']){await page.getByLabel(/Sort by/).selectOption(sort);const prices=(await cards.locator('.product-meta strong').allTextContents()).map(value=>Number(value.replace(/[^\d.]/g,'')));expect(prices).toEqual([...prices].sort((a,b)=>sort==='low'?a-b:b-a));}
 await page.getByRole('link',{name:/Find your style/}).click();await expect(cards.first().locator('.product-meta p')).toHaveText('Wigs');
 await search.fill('Selena');await page.getByRole('button',{name:'Add Selena to bag'}).click();await expect(page.locator('.drawer h2')).toHaveText('Your bag (1)');
 await page.getByRole('button',{name:'Increase quantity'}).click();await expect(page.locator('.drawer h2')).toHaveText('Your bag (2)');
 await page.getByRole('button',{name:'Decrease quantity'}).click();await expect(page.locator('.drawer h2')).toHaveText('Your bag (1)');
 await page.getByRole('button',{name:'Close bag'}).click();await page.reload();await expect(page.getByRole('button',{name:'Bag 1',exact:true})).toBeVisible();
 const tab=await page.context().newPage();await tab.goto('/');await expect(tab.getByRole('button',{name:'Bag 1',exact:true})).toBeVisible();await tab.close();
 await page.getByRole('button',{name:'Bag 1',exact:true}).click();await page.getByRole('link',{name:/Continue to checkout/}).click();
 await expect(page.getByRole('button',{name:/Place order/})).toBeDisabled();
 await page.locator('[name=senderName]').fill('Synthetic Customer');await page.locator('[name=senderPhone]').fill('08000000001');await page.locator('[name=email]').fill(email);
 await page.getByRole('checkbox',{name:/receiving this order/}).check();await expect(page.locator('[name=receiverName]')).toHaveCount(0);
 await page.locator('[name=location]').fill('Test City');await page.locator('[name=state]').selectOption('Lagos');await page.locator('[name=address]').fill('1 Fictional Road');
 await expect(page.locator('.checkout-total').last()).toContainText('65,000');
 let data:unknown,key:string|undefined;
 await page.route('**/api/orders',async route=>{if(route.request().method()==='POST'){data=route.request().postDataJSON();key=route.request().headers()['idempotency-key'];await route.abort();}else await route.continue();});
 await page.getByRole('button',{name:/Place order/}).click();await expect(page.locator('main').getByRole('alert')).toContainText('Connection interrupted');await page.unroute('**/api/orders');
 await page.getByRole('button',{name:/Place order/}).click();await expect(page.getByRole('heading',{name:'Simulated payment'})).toBeVisible();await expect(page.getByText('No payment was taken. Do not transfer money.',{exact:true})).toBeVisible();
 expect(await page.locator('.bank-transfer').textContent()).not.toContain('1031747948');
 const history=await (await page.request.get('/api/orders')).json();expect(history.data).toHaveLength(1);const number=history.data[0].order_number;expect(history.data[0].total_minor).toBe(6500000);
 expect((await (await page.request.get('/api/store/cart')).json()).data).toEqual([]);
 const replay=await post(page,'/api/orders',data,{'idempotency-key':key!});expect(replay.status()).toBe(200);expect((await replay.json()).orderNumber).toBe(number);
 await page.getByRole('link',{name:'Your orders',exact:true}).click();await expect(page.getByRole('heading',{name:number})).toBeVisible();
 const mail=await inbox(page,email),owner=await inbox(page,'owner@example.test');expect(mail.filter(item=>item.subject.includes(number))).toHaveLength(1);
 expect(mail.find(item=>item.subject.includes(number))?.body).toMatch(/SIMULATED ORDER[\s\S]*Selena[\s\S]*Quantity: 1[\s\S]*65,000/);
 expect(owner.find(item=>item.subject.includes(number))?.body).toContain(email);
 expect((await post(page,'/api/orders',{...checkout(email,'selena'),state:'Unavailable'})).status()).toBe(400);
 await page.goto('/#reviews');await page.locator('#review-name').fill('Synthetic Reviewer');await page.locator('#review-body').fill('A synthetic review for the review workflow.');await page.getByRole('button',{name:/Submit review/}).click();await expect(page.getByText(/review has been submitted/)).toBeVisible();
 expect((await (await page.request.get('/api/store/reviews')).json()).data).toEqual([]);
 const second=await browser.newContext({baseURL:origin});try{const outsider=await second.newPage();await unlock(outsider);await createAccount(outsider,address('outsider'));
  expect((await outsider.request.get(`/api/orders?reference=${number}`)).status()).toBe(404);expect((await (await outsider.request.get('/api/orders')).json()).data).toEqual([]);
  expect((await (await outsider.request.get('/api/store/cart')).json()).data).toEqual([]);
 }finally{await second.close();}
});

test('phone-sized seller navigation, listing submission, bank validation and second-account isolation',async({browser})=>{
 const sellerContext=await browser.newContext({baseURL:origin,viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const buyerContext=await browser.newContext({baseURL:origin});
 try{
  const page=await sellerContext.newPage(), buyer=await buyerContext.newPage();await unlock(page);await unlock(buyer);
  const seller=address('seller'),customer=address('buyer');await createAccount(page,seller);await createAccount(buyer,customer);
  const sellerId=(await session(page)).id;expect((await session(buyer)).id).not.toBe(sellerId);
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('status')).toContainText('Signed out');await page.goto('/sell');
  await page.getByRole('link',{name:/Sign in to start selling/}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('Email address').fill(seller);await dialog.getByLabel('Password',{exact:true}).fill(password);await dialog.getByRole('button',{name:'Sign in with email'}).click();await expect(page).toHaveURL(/\/sell$/);
  await page.goto('/');await page.getByRole('button',{name:'Toggle navigation'}).click();await expect(page.getByRole('navigation',{name:'Mobile navigation'})).toBeVisible();await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Sell on Shopora'}).click();
  await expect(page).toHaveURL(/\/sell$/);await expect(page.getByRole('heading',{name:'Where should we send your earnings?'})).toBeVisible();
  await page.getByLabel('Bank name',{exact:true}).fill('Test Bank');await page.getByLabel('Account name',{exact:true}).fill('Synthetic Seller');await page.getByLabel('Account number',{exact:true}).fill('123');
  expect(await page.getByLabel('Account number',{exact:true}).evaluate(input=>(input as HTMLInputElement).checkValidity())).toBe(false);
  expect((await post(page,'/api/store/payouts',{bank_name:'Test Bank',account_name:'Synthetic Seller',account_number:'123'})).status()).toBe(400);
  await page.getByLabel('Account number',{exact:true}).fill('0001234567');await page.getByRole('button',{name:'Save payout details'}).click();await expect(page.getByText(/Payout details saved/)).toBeVisible();
  await page.reload();await expect(page.getByLabel('Account number',{exact:true})).toHaveValue('0001234567');
  const fields={store:'Synthetic Shop',phone:'08000000001',name:'Preview rice sample',price:'2000',description:'Fictional 5 kg package for isolated review only.'};
  for(const [name,value] of Object.entries(fields))await page.locator(`form.seller-form [name=${name}]`).fill(value);
  await page.locator('[name=category]').selectOption('Other');await page.locator('[name=photo]').setInputFiles('public/products/Wigs/selena.jpg');
  expect(await page.locator('[name=commissionAgreement]').evaluate(input=>(input as HTMLInputElement).checkValidity())).toBe(false);
  await page.locator('[name=commissionAgreement]').check();await page.getByRole('button',{name:/Submit for review/}).click();await expect(page.getByText(/Product submitted!/)).toBeVisible();await expect(page.getByText('Awaiting review',{exact:true})).toBeVisible();
  const listings=(await (await page.request.get('/api/store/listings')).json()).data;expect(listings).toHaveLength(1);expect(listings[0].status).toBe('pending');expect((await page.request.get(listings[0].image_url)).status()).toBe(200);
  expect((await (await buyer.request.get('/api/store/listings?seller_id='+sellerId)).json()).data).toEqual([]);
  expect((await (await buyer.request.get('/api/store/payouts?seller_id='+sellerId)).json()).data).toBeNull();
  expect((await post(buyer,'/api/store/payouts',{seller_id:sellerId,bank_name:'Other Test Bank',account_name:'Synthetic Buyer',account_number:'0009876543'})).status()).toBe(200);
  expect((await (await page.request.get('/api/store/payouts')).json()).data.account_number).toBe('0001234567');
  expect((await (await buyer.request.get('/api/store/payouts')).json()).data.account_number).toBe('0009876543');
  expect((await post(buyer,'/api/store/listings',{store_name:'Copy Store',contact_phone:'08000000001',name:'Stolen photo',description:'Fictional invalid ownership example',category:'Other',price_minor:1000,image_url:listings[0].image_url,commissionAgreement:true})).status()).toBe(400);
  expect((await page.request.post('/api/store/media',{data:'not a photo',headers:{origin,'content-type':'image/png'}})).status()).toBe(400);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
 }finally{await sellerContext.close();await buyerContext.close();}
});

test('responsive public pages, seller sign-in routing, guest bag and invalid access paths',async({page})=>{
 await page.setViewportSize({width:360,height:800});await unlock(page);const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 for(const path of ['/','/app','/sell','/checkout','/account','/orders','/preview']){
  const response=await page.goto(path);expect(response?.status(),path).toBe(200);await expect(page.locator('h1').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`no horizontal overflow at ${path}`).toBe(true);
 }
 await page.goto('/sell');await page.getByRole('link',{name:/Sign in to start selling/}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.goto('/');await expect(page.getByText(/Guest cart/)).toBeVisible();await page.getByRole('button',{name:'Add Selena to bag'}).click();await expect(page.locator('.drawer h2')).toHaveText('Your bag (1)');
 await page.getByRole('button',{name:'Decrease quantity'}).click();await expect(page.locator('.drawer h2')).toHaveText('Your bag (0)');await page.getByRole('button',{name:/Find something lovely/}).click();await expect(page.locator('.drawer')).toHaveCount(0);
 for(const path of ['/api/store/cart','/api/orders','/api/store/listings','/api/store/payouts'])expect((await page.request.get(path)).status(),path).toBe(401);
 expect((await post(page,'/api/store/reviews',{display_name:'Synthetic Reviewer',rating:5,body:'A synthetic test review.'})).status()).toBe(401);
 expect((await page.goto('/not-a-real-shopora-route'))?.status()).toBe(404);expect(errors).toEqual([]);
});
