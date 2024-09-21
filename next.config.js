/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['lucide-react'],
    typescript: {
        ignoreBuildErrors: true,
    }
};

module.exports = nextConfig;
