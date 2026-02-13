const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const shimPath = path.resolve(__dirname, 'utils', 'react-native-font-shim.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === 'react-native' &&
    context.originModulePath &&
    context.originModulePath !== shimPath &&
    !context.originModulePath.includes('node_modules')
  ) {
    return { type: 'sourceFile', filePath: shimPath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
