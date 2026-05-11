import { defineConfig } from "prisma/config";
import * as fs from "fs";
import * as path from "path";

// Load .env manually so DATABASE_URL is available when config is evaluated
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim();
  }
}

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
