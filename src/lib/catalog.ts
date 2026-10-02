export type Product = {
  id: string;
  name: string;
  description: string;
  price_minor: number;
  category: string;
  image: string;
  badge?: string;
  color: string;
};

const product = (id: string, name: string, category: string, price: number, image: string, color: string): Product => ({
  id, name, category, price_minor: price * 100, image: `/products/${image}`, color,
  description: category === "Electronics" ? "Good tech, ready for everyday life." : category === "Wigs" ? "A new look, chosen just for you." : "A lovely find for your collection.",
});

export const demoProducts: Product[] = [
  product("iphone-13-pro-128gb", "iPhone 13 Pro 128GB — UK Used", "Electronics", 550000, "Electronics/iphone-13-pro-128gb.jpg", "sand"),
  product("iphone-12-pro", "iPhone 12 Pro — UK Used", "Electronics", 380000, "Electronics/iphone-12-pro.jpg", "sand"),
  product("iphone-13", "iPhone 13 — UK Used", "Electronics", 450000, "Electronics/iphone-13.jpg", "sand"),
  product("airtab-s26-ultra", "Airtab S26 Ultra 5G", "Electronics", 180000, "Electronics/airtab-s26-ultra.jpg", "sand"),
  product("anker-548-power-bank", "Anker 548 Power Bank", "Electronics", 160000, "Electronics/anker-548-power-bank.jpg", "sand"),
  product("airtab-s10-ultra", "Airtab S10 Ultra Tablet Kit", "Electronics", 250000, "Electronics/airtab-s10-ultra.jpg", "sand"),
  product("seagate-expansion", "Seagate Expansion External Drive", "Electronics", 140000, "Electronics/seagate-expansion.jpg", "sand"),
  product("portable-a4-printer", "Portable A4 Printer with Thermal Paper", "Electronics", 120000, "Electronics/portable-a4-printer.jpg", "sand"),
  product("atouch-x19-life", "Atouch X19 Life Tablet Kit", "Electronics", 110000, "Electronics/atouch-x19-life.jpg", "sand"),
  product("anker-737-power-bank", "Anker 737 Power Bank 24,000mAh", "Electronics", 180000, "Electronics/anker-737-power-bank.jpg", "sand"),
  product("hithium-hero-ee2", "Hithium Hero EE2 Power Station", "Electronics", 1500000, "Electronics/hithium-hero-ee2.jpg", "sand"),
  product("island-breeze", "Island Breeze", "Perfumes", 18000, "Perfumes/island-breeze.jpg", "sand"),
  product("khamrah-perfume-set", "Khamrah Eau de Parfum Gift Set", "Perfumes", 35000, "Perfumes/khamrah-perfume-set.jpg", "sand"),
  product("kaly-perfume", "Kaly Eau de Parfum", "Perfumes", 20000, "Perfumes/kaly-perfume.jpg", "sand"),
  product("wireless-mini-printer", "Wireless Mini Printer", "Electronics", 38000, "Electronics/wireless_mini_printer.jpg", "sand"),
  product("tablet-16gb-512gb", "Tablet 16GB / 512GB", "Electronics", 220000, "Electronics/tablet_16gb_512gb.jpg", "clay"),
  product("dell-inspiron-16gb-512gb", "Dell Inspiron 16GB / 512GB", "Electronics", 1800000, "Electronics/dell_inspiron_16gb_512gb.jpg", "olive"),
  product("dell-latitude-7490", "Dell Latitude 7490 8GB / 256GB", "Electronics", 300000, "Electronics/dell_latitude_7490.jpg", "lilac"),
  product("cidea-tab", "Cidea Tab 8GB / 256GB", "Electronics", 170000, "Electronics/cidea_tab.jpg", "butter"),
  product("airtab", "Airtab 16GB / 256GB", "Electronics", 160000, "Electronics/airtab.jpg", "rose"),
  product("canon-eos-650", "Canon EOS 650", "Electronics", 500000, "Electronics/canon_eos_650.jpg", "sand"),
  product("ipad-4gb-128gb", "iPad 4GB / 128GB", "Electronics", 650000, "Electronics/ipad_4gb_128gb.jpg", "clay"),
  product("iphone-17-pro-max-256gb", "iPhone 17 Pro Max 256GB", "Electronics", 1700000, "Electronics/iphone_17_pro_max.jpg", "olive"),
  product("iphone-16-256gb", "iPhone 16 256GB", "Electronics", 1100000, "Electronics/iphone_16.jpg", "lilac"),
  product("logitech-wireless-mouse-250", "Logitech Wireless Mouse 250", "Electronics", 30000, "Electronics/logitech_wireless_mouse_250.jpg", "butter"),
  product("logi-125", "Logi 125", "Electronics", 45000, "Electronics/logi_125.jpg", "rose"),
  product("logitech-wireless-340", "Logitech Wireless 340", "Electronics", 35000, "Electronics/logitech_wireless_340.jpg", "sand"),
  product("dell-latitude-5390", "Dell Latitude 5390 8GB RAM / 256GB SSD", "Electronics", 250000, "Electronics/dell_latitude_5390.jpg", "clay"),
  product("lenovo-thinkpad-t480s", "Lenovo ThinkPad T480s 16GB RAM / 256GB SSD", "Electronics", 290000, "Electronics/lenovo_thinkpad_t480s.jpg", "olive"),
  product("iphone-xr-64gb", "iPhone XR 64GB", "Electronics", 230000, "Electronics/iphone_xr_64gb.jpg", "lilac"),
  product("google-pixel-10-pro-fold", "Google Pixel 10 Pro Fold 12GB / 256GB", "Electronics", 1200000, "Electronics/google_pixel_10_pro_fold.jpg", "butter"),
  product("selena", "Selena", "Wigs", 60000, "Wigs/selena.jpg", "rose"),
  product("capri-wave", "Capri Wave", "Wigs", 75000, "Wigs/capri_wave.jpg", "sand"),
  product("isla-wave", "Isla Wave", "Wigs", 72000, "Wigs/isla_wave.jpg", "clay"),
  product("asad-bourbon", "Asad Bourbon", "Perfumes", 35000, "Perfumes/asad_bourbon.jpg", "olive"),
  product("overdose", "Overdose", "Perfumes", 75000, "Perfumes/overdose.jpg", "lilac"),
  product("undiluted-perfume-oils-50ml", "Undiluted Perfume Oils — 50ml", "Perfumes", 20000, "Perfumes/undiluted_perfume_oils.jpg", "butter"),
  product("undiluted-perfume-oils-100ml", "Undiluted Perfume Oils — 100ml", "Perfumes", 35000, "Perfumes/undiluted_perfume_oils.jpg", "rose"),
  product("qaed-al-fursan", "Qaed Al Fursan", "Perfumes", 27000, "Perfumes/qaed_al_fursan.jpg", "sand"),
  product("red-diamond", "Red Diamond", "Perfumes", 10500, "Perfumes/red_diamond.jpg", "clay"),
  product("matelot-100ml", "Matelot 100ml", "Perfumes", 17000, "Perfumes/matelot_100ml.jpg", "olive"),
  product("oud-al-layl", "Oud Al Layl", "Perfumes", 18000, "Perfumes/oud_al_layl.jpg", "lilac"),
  product("perfume-collection-blue", "Perfume Collection — Blue", "Perfumes", 16000, "Perfumes/perfume_collection_blue.jpg", "butter"),
  product("perfume-collection-pink", "Perfume Collection — Pink", "Perfumes", 20000, "Perfumes/perfume_collection_pink.jpg", "rose"),
  product("perfume-collection-multi", "Perfume Collection — Multi", "Perfumes", 12000, "Perfumes/perfume_collection_multi.jpg", "sand"),
  product("perfume-collection-boxed", "Perfume Collection — Boxed", "Perfumes", 8500, "Perfumes/perfume_collection_boxed.jpg", "clay"),
  product("ameer-al-oud", "Ameer Al Oud", "Perfumes", 28000, "Perfumes/ameer_al_oud.jpg", "olive"),
];

export function formatPrice(minor: number) {
  const currency = process.env.NEXT_PUBLIC_STORE_CURRENCY || "NGN";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
}
