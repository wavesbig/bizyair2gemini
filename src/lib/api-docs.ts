export interface ApiDocApp {
  modelName: string;
  mappings?: string;
}

function parseMappings(mappings?: string) {
  if (!mappings) return {};

  try {
    return JSON.parse(mappings) as Record<string, string>;
  } catch {
    return {};
  }
}

export function getProductionOrigin(origin?: string) {
  if (!origin) return "https://your-production-domain.com";
  return origin.replace(/\/$/, "");
}

export function inferApiStyle(app: ApiDocApp) {
  const mappings = parseMappings(app.mappings);
  const keys = Object.keys(mappings);

  if (keys.some((key) => key.startsWith("contents."))) {
    return "gemini";
  }

  return "openai";
}

export function buildModelsCurl(origin?: string) {
  const baseUrl = getProductionOrigin(origin);

  return `curl -X GET "${baseUrl}/api/v1/models" \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY"`;
}

export function buildAppCurl(app: ApiDocApp, origin?: string) {
  const baseUrl = getProductionOrigin(origin);
  const style = inferApiStyle(app);

  if (style === "gemini") {
    return `curl -X POST "${baseUrl}/api/v1beta/models/${app.modelName}/generateContent" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "一只站在霓虹雨夜街头的橘猫，电影感，细节丰富"
          }
        ]
      }
    ],
    "generationConfig": {
      "imageConfig": {
        "aspectRatio": "1:1",
        "imageSize": "1024"
      },
      "seed": 12345,
      "temperature": 0.8,
      "topP": 0.95
    }
  }'`;
  }

  return `curl -X POST "${baseUrl}/api/v1/chat/completions" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_PROXY_API_KEY" \\
  -d '{
    "model": "${app.modelName}",
    "messages": [
      {
        "role": "user",
        "content": "一只站在霓虹雨夜街头的橘猫，电影感，细节丰富"
      }
    ],
    "temperature": 0.8,
    "top_p": 0.95
  }'`;
}

export function buildDashboardUsage(app?: ApiDocApp, origin?: string) {
  const sampleApp = app ?? { modelName: "your-model-name" };

  return {
    modelsCurl: buildModelsCurl(origin),
    requestCurl: buildAppCurl(sampleApp, origin),
    style: inferApiStyle(sampleApp),
  };
}
