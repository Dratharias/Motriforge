export default {
  // Répertoires où Jest cherchera les tests
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  
  // Transformations des fichiers
  transform: {
    // Utiliser babel pour transformer les fichiers JS/JSX
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Environnement de test
  testEnvironment: 'node',
  
  // Répertoire où les transformations sont mises en cache
  transformIgnorePatterns: ['/node_modules/', '^.+\\.module\\.(css|sass|scss)$'],
  
  // Configuration du coverage
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // Configuration des modules
  moduleNameMapper: {
    // Gestion des imports de styles (si vous en avez)
    '^.+\\.module\\.(css|sass|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Setup files - le fichier qui va charger nos variables d'environnement
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Options de reporter
  verbose: true,
  
  // Timeout global pour les tests (en ms)
  testTimeout: 30000,
};