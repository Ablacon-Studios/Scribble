/**
 * Babel configuration for Jest tests.
 * Uses .cjs extension because package.json has "type": "module".
 */
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
  ],
};
