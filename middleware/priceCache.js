// Cache validation logic with 6 AM rule
// 快取規則：當天早上 6 點前不更新，6 點後更新

import fs from "fs/promises";

export async function shouldUpdateCache(configPath) {
  try {
    const data = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(data);

    if (!config.enabled) {
      return true;
    }

    const lastUpdate = new Date(config.lastUpdate);
    const now = new Date();

    // Get today's 6 AM
    const today6AM = new Date(now);
    today6AM.setHours(6, 0, 0, 0);

    // If last update was before today's 6 AM and now is after 6 AM, update
    if (lastUpdate < today6AM && now >= today6AM) {
      return true;
    }

    // If last update was yesterday or earlier, update
    const lastUpdateDate = new Date(lastUpdate);
    lastUpdateDate.setHours(0, 0, 0, 0);
    const todayDate = new Date(now);
    todayDate.setHours(0, 0, 0, 0);

    if (lastUpdateDate < todayDate) {
      return true;
    }

    return false;
  } catch (error) {
    // No config file = need to create cache
    return true;
  }
}
