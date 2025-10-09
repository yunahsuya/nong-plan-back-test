// Cache validation logic with 10 AM rule
// 快取規則：當天早上 10 點前不更新，10 點後更新

import fs from "fs/promises";

export async function shouldUpdateCache(configPath) {
  try {
    const config = JSON.parse(await fs.readFile(configPath, "utf8"));
    if (!config.enabled) return true;

    return Date.now() >= getNext10AM(new Date(config.lastUpdate));
  } catch {
    return true; // No config = need cache
  }
}

function getNext10AM(lastUpdate) {
  const next = new Date(lastUpdate);
  next.setHours(10, 0, 0, 0);

  // If last update is already past today's 10AM, use tomorrow's 10AM
  if (lastUpdate >= next) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
}
