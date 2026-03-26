/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['lucide-react'],
    typescript: {
        ignoreBuildErrors: true,
    },
    reactCompiler: true,
    // Prevent webpack from bundling arima's WASM binary — load it natively in Node.js
    serverExternalPackages: ['arima'],
};

module.exports = nextConfig;
