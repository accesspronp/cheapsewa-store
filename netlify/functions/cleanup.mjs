import { getStore } from "@netlify/blobs";

const KEEP_DAYS = 60;

export default async () => {
  const orders = getStore("orders");
  const shots = getStore("screenshots");
  const cutoff = Date.now() - KEEP_DAYS * 86400 * 1000;
  const { blobs } = await orders.list();
  for (const { key } of blobs) {
    const order = await orders.get(key, { type: "json" });
    if (order && order.hasImage && Date.parse(order.createdAt) < cutoff) {
      await shots.delete(key);
      order.hasImage = false;
      await orders.setJSON(key, order);
    }
  }
};

export const config = { schedule: "@daily" };
