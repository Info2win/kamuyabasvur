/**
 * Sağlık kontrolü — veritabanı gerektirmez.
 * Uygulama tüm veriyi tarayıcıda (localStorage) tutar; bu uç yalnızca
 * dağıtım platformlarının canlılık kontrolü için vardır.
 */
export async function GET() {
  return Response.json({
    ok: true,
    mode: "client-storage",
    time: new Date().toISOString(),
  });
}
