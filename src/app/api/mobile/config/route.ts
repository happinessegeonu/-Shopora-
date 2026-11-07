export async function GET() { return Response.json({ error: "This legacy mobile configuration endpoint has been retired." }, { status: 410 }); }
