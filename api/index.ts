// @ts-ignore
import { createApp } from "../dist/server.cjs";

let appPromise: any = null;

try {
  appPromise = createApp();
} catch (initErr: any) {
  console.error("Failed to initialize express app:", initErr);
}

export default async function handler(req: any, res: any) {
  try {
    if (!appPromise) {
      throw new Error("createApp failed to run during initial loading phase");
    }
    const app = await appPromise;
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Crash:", err);
    res.status(500).json({
      status: "error",
      error: "Vercel Serverless Function Crash",
      message: err?.message || String(err),
      stack: err?.stack || ""
    });
  }
}
