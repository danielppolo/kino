/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['lucide-react'],
    typescript: {
        ignoreBuildErrors: true,
    },
    reactCompiler: true,
};

module.exports = nextConfig;
