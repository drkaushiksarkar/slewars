import fs from "fs/promises";
import path from "path";
import logger from "./logger.js";

type FeatureCollection = {
  type: string;
  features: Array<Record<string, unknown>>;
  [key: string]: unknown;
};

const SLE_GEOJSON_PATH = path.join(
  process.cwd(),
  "server",
  "data",
  "sierra-leone-adm1.geojson"
);

class GeojsonService {
  private sleAdm1: FeatureCollection | null = null;

  public async getSierraLeoneAdm1(): Promise<FeatureCollection> {
    if (!this.sleAdm1) {
      try {
        const raw = await fs.readFile(SLE_GEOJSON_PATH, "utf-8");
        this.sleAdm1 = JSON.parse(raw);
      } catch (error) {
        logger.error({ error }, "Failed to load Sierra Leone ADM1 geojson");
        throw error;
      }
    }

    return this.sleAdm1!;
  }
}

export const geojsonService = new GeojsonService();
