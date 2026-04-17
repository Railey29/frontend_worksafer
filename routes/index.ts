import type { Express } from "express";
import http from "http";

export async function registerRoutes(app: Express) {
  // ✅ Example API routes
  app.get("/api/hello", (_req, res) => {
    res.json({ message: "Hello from WorkSAFER backend!" });
  });

  app.get("/api/status", (_req, res) => {
    res.json({
      status: "OK",
      environment: process.env.NODE_ENV || "development",
    });
  });

  // ✅ Create HTTP server and return it
  const server = http.createServer(app);
  return server;
}
