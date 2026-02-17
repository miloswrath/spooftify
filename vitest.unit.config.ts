<<<<<<< HEAD
=======
<<<<<<< HEAD
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.component.test.tsx"]
  }
=======
>>>>>>> 20e3cb62fc2d0791b38dde13657395b5873b9d8b
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.component.test.tsx", "src/features/**/*.test.ts"]
  }
<<<<<<< HEAD
=======
>>>>>>> 956bf5cee38784c789f5b6f1c67b92280ac2ca8b
>>>>>>> 20e3cb62fc2d0791b38dde13657395b5873b9d8b
});