const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Allow Metro to resolve files outside the project root (packages/ui, common).
config.watchFolders = [
  path.resolve(__dirname, '../ui'),
  path.resolve(__dirname, '../../common'),
];

config.resolver.extraNodeModules = {
  '@volt/ui': path.resolve(__dirname, '../ui'),
  '@common': path.resolve(__dirname, '../../common'),
};

module.exports = config;
