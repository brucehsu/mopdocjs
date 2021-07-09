// @flow

const {buildAST: build} = require('./buildAST');
const {compileMarkdown} = require('./formats/markdown');

module.exports = {
  build,
  formats: {
    md: compileMarkdown
  }
};
