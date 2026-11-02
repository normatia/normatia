// The version lives in the git tags and on npm: no commit goes back to main.
module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/npm',
      {
        pkgRoot: '.',
      },
    ],
    '@semantic-release/github',
  ],
};
