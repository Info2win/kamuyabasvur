import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export', // Sitenin './out' klasörüne statik olarak derlenmesini sağlar.
  images: {
    unoptimized: true, // Sitenizdeki görsellerin github.io'da kırık görünmesini engeller.
  },
};

export default nextConfig;