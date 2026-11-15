import { getStore } from "@netlify/blobs";
import { safe } from "../lib/lib.mjs";

export default safe(async (req) => {
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 0) return new Response("Bad id", { status: 400 });
  const d = await getStore("productimg").get("p" + id, { type: "json" });
  if (!d) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(d.b64, "base64"), { headers: { "Content-Type": d.mime, "Cache-Control": "public, max-age=31536000, immutable" } });
});
export const config = { path: "/api/product-img" };
