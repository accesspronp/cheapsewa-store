import { getStore } from "@netlify/blobs";
import { json, safe } from "../lib/lib.mjs";

export default safe(async () => {
  const overrides = (await getStore("catalog").get("overrides", { type: "json" })) || {};
  return json({ ok: true, overrides });
});
export const config = { path: "/api/catalog" };
