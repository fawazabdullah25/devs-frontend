import { defineConfig, loadEnv } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import { nitro } from "nitro/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const usesMocks = env.VITE_USE_MOCKS === "true"

  if (command === "build" && !usesMocks && !env.VITE_API_URL) {
    throw new Error(
      "VITE_API_URL is required for production builds unless VITE_USE_MOCKS=true."
    )
  }

  return {
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      tailwindcss(),
      tanstackStart(),
      ...(mode === "test" ? [] : [nitro()]),
      viteReact(),
    ],
  }
})

export default config
