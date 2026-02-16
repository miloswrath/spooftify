<<<<<<< HEAD
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.component.test.tsx"]
  }
=======
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.component.test.tsx", "src/features/**/*.test.ts"]
  }
>>>>>>> 956bf5cee38784c789f5b6f1c67b92280ac2ca8b
});