import * as fs from "fs";
import * as path from "path";
import {
  authCheck,
  uploadDataset,
  trainPredictionModel,
  trainClusteringModel,
  pollModelUntilComplete,
} from "./woodwideClient";

const CACHE_FILE = path.join(process.cwd(), ".woodwide-cache.json");
const TRAIN_DATA_PATH = path.join(process.cwd(), "data", "woodwide", "neurocast_train_v1.csv");

const DATASET_NAME = process.env.WOODWIDE_DATASET_NAME || "neurocast_train_v1";
const PRED_MODEL_NAME = process.env.WOODWIDE_PRED_MODEL || "neurocast_readiness_pred_v1";
const CLUSTER_MODEL_NAME = process.env.WOODWIDE_CLUSTER_MODEL || "neurocast_segments_cluster_v1";

interface WoodWideCache {
  trainDatasetId: string;
  predModelId: string;
  clusterModelId: string;
  createdAt: string;
}

export interface WoodWideModels {
  trainDatasetId: string;
  predModelId: string;
  clusterModelId: string;
}

function readCache(): WoodWideCache | null {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const content = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn("Failed to read Wood Wide cache:", err);
  }
  return null;
}

function writeCache(cache: WoodWideCache): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write Wood Wide cache:", err);
  }
}

export async function getOrCreateModels(): Promise<WoodWideModels> {
  const cached = readCache();
  if (cached) {
    console.log("✅ Using cached Wood Wide models:", cached);
    return {
      trainDatasetId: cached.trainDatasetId,
      predModelId: cached.predModelId,
      clusterModelId: cached.clusterModelId,
    };
  }

  console.log("🔧 No cache found. Bootstrapping Wood Wide models...");

  // Check auth
  const auth = await authCheck();
  console.log(`✅ Wood Wide auth OK: user_id=${auth.user_id}, credits=${auth.credits}`);

  // Upload training dataset
  if (!fs.existsSync(TRAIN_DATA_PATH)) {
    throw new Error(`Training data not found at ${TRAIN_DATA_PATH}. Run scripts/generateWoodwideData.js first.`);
  }

  const csvContent = fs.readFileSync(TRAIN_DATA_PATH, "utf-8");
  console.log(`📤 Uploading training dataset: ${DATASET_NAME} (${csvContent.length} bytes)`);
  const { dataset_id: trainDatasetId } = await uploadDataset(csvContent, DATASET_NAME, true);
  console.log(`✅ Dataset uploaded: ${trainDatasetId}`);

  // Train prediction model
  console.log(`🤖 Training prediction model: ${PRED_MODEL_NAME}`);
  const predResp = await trainPredictionModel(DATASET_NAME, PRED_MODEL_NAME, "needs_escalation");
  console.log(`⏳ Prediction model training started: ${predResp.model_id} (${predResp.training_status})`);
  await pollModelUntilComplete(predResp.model_id);
  console.log(`✅ Prediction model complete: ${predResp.model_id}`);

  // Train clustering model
  console.log(`🤖 Training clustering model: ${CLUSTER_MODEL_NAME}`);
  const clusterResp = await trainClusteringModel(DATASET_NAME, CLUSTER_MODEL_NAME);
  console.log(`⏳ Clustering model training started: ${clusterResp.model_id} (${clusterResp.training_status})`);
  await pollModelUntilComplete(clusterResp.model_id);
  console.log(`✅ Clustering model complete: ${clusterResp.model_id}`);

  const cache: WoodWideCache = {
    trainDatasetId,
    predModelId: predResp.model_id,
    clusterModelId: clusterResp.model_id,
    createdAt: new Date().toISOString(),
  };
  writeCache(cache);

  console.log("🎉 Wood Wide bootstrap complete:", cache);
  return {
    trainDatasetId: cache.trainDatasetId,
    predModelId: cache.predModelId,
    clusterModelId: cache.clusterModelId,
  };
}
