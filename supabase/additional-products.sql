-- Provisional prices for the additional products supplied in website-images.zip.
insert into public.products (id,name,description,price_minor,category,image_url,color,stock,active) values
('iphone-13-pro-128gb','iPhone 13 Pro 128GB — UK Used','Good tech, ready for everyday life.',55000000,'Electronics','/products/Electronics/iphone-13-pro-128gb.jpg','sand',null,true),
('iphone-12-pro','iPhone 12 Pro — UK Used','Good tech, ready for everyday life.',38000000,'Electronics','/products/Electronics/iphone-12-pro.jpg','sand',null,true),
('iphone-13','iPhone 13 — UK Used','Good tech, ready for everyday life.',45000000,'Electronics','/products/Electronics/iphone-13.jpg','sand',null,true),
('airtab-s26-ultra','Airtab S26 Ultra 5G','Good tech, ready for everyday life.',18000000,'Electronics','/products/Electronics/airtab-s26-ultra.jpg','sand',null,true),
('anker-548-power-bank','Anker 548 Power Bank','Good tech, ready for everyday life.',16000000,'Electronics','/products/Electronics/anker-548-power-bank.jpg','sand',null,true),
('airtab-s10-ultra','Airtab S10 Ultra Tablet Kit','Good tech, ready for everyday life.',25000000,'Electronics','/products/Electronics/airtab-s10-ultra.jpg','sand',null,true),
('seagate-expansion','Seagate Expansion External Drive','Good tech, ready for everyday life.',14000000,'Electronics','/products/Electronics/seagate-expansion.jpg','sand',null,true),
('portable-a4-printer','Portable A4 Printer with Thermal Paper','Good tech, ready for everyday life.',12000000,'Electronics','/products/Electronics/portable-a4-printer.jpg','sand',null,true),
('atouch-x19-life','Atouch X19 Life Tablet Kit','Good tech, ready for everyday life.',11000000,'Electronics','/products/Electronics/atouch-x19-life.jpg','sand',null,true),
('anker-737-power-bank','Anker 737 Power Bank 24,000mAh','Good tech, ready for everyday life.',18000000,'Electronics','/products/Electronics/anker-737-power-bank.jpg','sand',null,true),
('hithium-hero-ee2','Hithium Hero EE2 Power Station','Good tech, ready for everyday life.',150000000,'Electronics','/products/Electronics/hithium-hero-ee2.jpg','sand',null,true),
('island-breeze','Island Breeze','A lovely find for your collection.',1800000,'Perfumes','/products/Perfumes/island-breeze.jpg','sand',null,true),
('khamrah-perfume-set','Khamrah Eau de Parfum Gift Set','A lovely find for your collection.',3500000,'Perfumes','/products/Perfumes/khamrah-perfume-set.jpg','sand',null,true),
('kaly-perfume','Kaly Eau de Parfum','A lovely find for your collection.',2000000,'Perfumes','/products/Perfumes/kaly-perfume.jpg','sand',null,true)
on conflict(id) do update set name=excluded.name, price_minor=excluded.price_minor,image_url=excluded.image_url,active=true;
select count(*) as added_products from public.products where id in ('iphone-13-pro-128gb','iphone-12-pro','iphone-13','airtab-s26-ultra','anker-548-power-bank','airtab-s10-ultra','seagate-expansion','portable-a4-printer','atouch-x19-life','anker-737-power-bank','hithium-hero-ee2','island-breeze','khamrah-perfume-set','kaly-perfume');
