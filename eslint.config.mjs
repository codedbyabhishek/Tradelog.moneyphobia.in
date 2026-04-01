import nextVitals from 'eslint-config-next/core-web-vitals';

const eslintConfig = [
  ...nextVitals,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'php-db-admin/**',
      'public/sw.js',
    ],
  },
];

export default eslintConfig;
