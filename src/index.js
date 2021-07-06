// @flow
const fs = require('fs');
const { parse } = require('@babel/parser');
const { default: traverse } = require('@babel/traverse');
const { parse: parseComment } = require('comment-parser/lib');

module.exports = {
  build: async (indexes: Array<string>|string, options: Object) => {
    const babelOpts = {
      sourceType: "module",
      plugins: [
        "flow",
      ]
    };
    const readSourceFromFile = (path: string): string => {
      const data = fs.readFileSync(path);
      return data.toString();
    }
    const processComments = (path: string) => {
      const ast = parse(readSourceFromFile(path), babelOpts);
      traverse(ast, {
        enter(path) {
          ['ModuleDeclaration', 'ClassDeclaration', 'FunctionDeclaration', 'ClassMethod'].forEach((nodeClass) => {
            if (path[`is${nodeClass}`]()) {
              path.node.leadingComments.forEach((commentBlock) => {
                const parsed = parseComment(`/*${commentBlock.value}\n*/`)
                console.log(parsed[0].tags);
              });
            }
          });
        },
      });
    }
    if (typeof indexes === 'string') {
      processComments(indexes);
    } else {
      indexes.forEach(processComments);
    }
  }
};
