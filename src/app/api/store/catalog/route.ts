import { database } from "@/server/postgres";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET() {
  if(process.env.SHOPORA_BACKEND!=="postgres") return Response.json({error:"Migration not activated."},{status:503});
  try {
    const [products,rates]=await Promise.all([
      database().query("select id,name,description,price_minor::float8 as price_minor,category,image_url,badge,color,stock from shopora_products where active=true order by created_at desc"),
      database().query("select state,fee_minor::float8 as fee_minor from shopora_shipping_rates where active=true order by state"),
    ]);
    return Response.json({products:products.rows,rates:rates.rows},{headers:{"Cache-Control":"no-store"}});
  } catch { return Response.json({error:"Catalogue temporarily unavailable."},{status:503}); }
}
