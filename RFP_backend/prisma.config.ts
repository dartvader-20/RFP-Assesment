import { defineConfig } from "@prisma/client";

export default defineConfig({
  datasources: {
    db: {
      adapter: "postgresql",                 // type of database
      url: process.env.DATABASE_URL,         // read from .env
    },
  },
  generators: {
    client: {
      provider: "prisma-client-js",
    },
  },
});
