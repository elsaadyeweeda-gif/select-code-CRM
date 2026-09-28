let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    try {
      // Attempt loading from compiled distribution bundle
      // @ts-ignore
      const mod = await import("../dist/server.cjs");
      appInstance = await mod.createApp();
    } catch (bundleErr) {
      // Fallback: direct import from server source (standard in Vercel Serverless TypeScript)
      const mod = await import("../server");
      appInstance = await mod.createApp();
    }
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();
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
