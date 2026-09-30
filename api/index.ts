let appInstance: any = null;

async function getApp() {
  if (!appInstance) {
    try {
      // 1. Attempt loading from compiled distribution bundle (fastest for production Vercel)
      // @ts-ignore
      const mod = await import("../dist/server.cjs");
      if (typeof mod.createApp === 'function') {
        appInstance = await mod.createApp();
      } else if (mod.default && typeof mod.default.createApp === 'function') {
        appInstance = await mod.default.createApp();
      }
    } catch (bundleErr) {
      // 2. Fallback: direct import from server source (standard in Vercel Serverless TypeScript)
      const mod = await import("../server");
      appInstance = await mod.createApp();
    }
  }
  return appInstance;
}

export default async function handler(req: any, res: any) {
  try {
    // Normalize request URL if Vercel serverless rewrite strips '/api'
    if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/index.html')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    const app = await getApp();
    return app(req, res);
  } catch (err: any) {
    console.error("Vercel Serverless Function Crash:", err);
    res.status(500).json({
      status: "error",
      error: "Vercel Serverless Function Crash",
      message: err?.message || String(err),
      stack: process.env.NODE_ENV === 'development' ? err?.stack : undefined
    });
  }
}

