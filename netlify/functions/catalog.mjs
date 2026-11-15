import { getStore } from "@netlify/blobs";
import { json, safe } from "../lib/lib.mjs";

export default safe(async () => {
  const st = getStore("catalog");
  const overrides = (await st.get("overrides", { type: "json" })) || {};
  const texts = (await st.get("texts", { type: "json" })) || {};
  return json({ ok: true, overrides, texts });
});
export const config = { path: "/api/catalog" };
