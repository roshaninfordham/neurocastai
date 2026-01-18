const API_KEY = process.env.WOODWIDE_API_KEY;
const BASE_URL = process.env.WOODWIDE_BASE_URL || "https://beta.woodwide.ai";

if (!API_KEY) {
  console.warn("WOODWIDE_API_KEY not set; Wood Wide client will fail at runtime.");
}

// WoodWideResponse type defined for reference but not currently used in this module
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type WoodWideResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function makeRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const headers = {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });
  
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Wood Wide API ${response.status}: ${text}`);
  }

  const json = await response.json();
  return json as T;
}

export async function authCheck(): Promise<{ user_id: string; credits: number }> {
  const data = await makeRequest<{ user_id: string; credits: number }>("/auth/me");
  return data;
}

export async function uploadDataset(
  csvContent: string,
  datasetName: string,
  overwrite = true
): Promise<{ dataset_id: string }> {
  const formData = new FormData();
  const blob = new Blob([csvContent], { type: "text/csv" });
  formData.append("file", blob, `${datasetName}.csv`);
  formData.append("name", datasetName);
  if (overwrite) formData.append("overwrite", "true");

  const url = `${BASE_URL}/api/datasets`;
  const headers = { Authorization: `Bearer ${API_KEY}` };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload dataset failed ${response.status}: ${text}`);
  }

  const json = await response.json();
  return json as { dataset_id: string };
}

export async function trainPredictionModel(
  datasetName: string,
  modelName: string,
  labelColumn: string
): Promise<{ model_id: string; training_status: string }> {
  const params = new URLSearchParams({
    dataset_name: datasetName,
    model_name: modelName,
    label_column: labelColumn,
  });

  const data = await makeRequest<{ model_id: string; training_status: string }>(
    `/api/models/prediction/train?${params}`,
    { method: "POST" }
  );
  return data;
}

export async function trainClusteringModel(
  datasetName: string,
  modelName: string
): Promise<{ model_id: string; training_status: string }> {
  const params = new URLSearchParams({
    dataset_name: datasetName,
    model_name: modelName,
  });

  const data = await makeRequest<{ model_id: string; training_status: string }>(
    `/api/models/clustering/train?${params}`,
    { method: "POST" }
  );
  return data;
}

export async function getModelStatus(
  modelId: string
): Promise<{ model_id: string; training_status: string; accuracy?: number }> {
  const data = await makeRequest<{ model_id: string; training_status: string; accuracy?: number }>(
    `/api/models/${modelId}/status`
  );
  return data;
}

export async function pollModelUntilComplete(
  modelId: string,
  maxAttempts = 60,
  intervalMs = 2000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getModelStatus(modelId);
    if (status.training_status === "COMPLETE") {
      return;
    }
    if (status.training_status === "FAILED") {
      throw new Error(`Model ${modelId} training failed`);
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Model ${modelId} training timeout after ${maxAttempts} attempts`);
}

export async function inferPrediction(
  modelId: string,
  datasetId: string
): Promise<{ predictions: Array<{ prediction: number; probability?: number }> }> {
  const params = new URLSearchParams({ dataset_id: datasetId });
  const data = await makeRequest<{ predictions: Array<{ prediction: number; probability?: number }> }>(
    `/api/models/prediction/${modelId}/infer?${params}`,
    { method: "POST" }
  );
  return data;
}

export async function inferClustering(
  modelId: string,
  datasetId: string
): Promise<{ clusters: Array<{ cluster_id: number; cluster_name?: string }> }> {
  const params = new URLSearchParams({ dataset_id: datasetId });
  const data = await makeRequest<{ clusters: Array<{ cluster_id: number; cluster_name?: string }> }>(
    `/api/models/clustering/${modelId}/infer?${params}`,
    { method: "POST" }
  );
  return data;
}
