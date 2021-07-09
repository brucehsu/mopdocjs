// @flow
import type {DocAST, Parameter} from "../buildAST";

const {DocNode, defaultScopeASTIndex} = require('../buildAST');

function addHeader(header: string, level: number = 2): string {
    return `${'#'.repeat(level)} ${header}\n`;
}

function addListItem(item: string): string {
    return `- ${item}\n`;
}

function compileDocNode(node: ?DocNode, level: number = 2): string {
    if (node == null) {
        return '';
    }
    const { parameters, returns, name, description } = node;
    let result = "\n";

    result += addHeader(name, level);
    result += `${description}\n`;

    if (parameters.length > 0) {
        result += addHeader('Parameters', level + 1);
        parameters.forEach((param: Parameter) => {
            const item = `\`${param.name}\` **${param.type}** ${param.optional ? "*optional* " : ''} ${param.description}`;
            result += addListItem(item);
        });
    }

    if (returns != null) {
        result += addHeader('Returns', level + 1);
        result += addListItem(`**${returns.type}** ${returns.optional ? "*optional* " : ''} ${returns.description}`);
    }

    return result;
}

async function compileMarkdown(docASTByModule:Map<string, DocAST>): Promise<string> {
    let markdownOutput = '';
    let level: number = 3;
    docASTByModule.forEach((ast: DocAST, moduleOrClass: string) => {
        level -= 1;
        if (moduleOrClass !== defaultScopeASTIndex) {
            markdownOutput += compileDocNode(ast[0]);
            level += 2;
        }
        ast[1].forEach((node: DocNode) => {
            markdownOutput += compileDocNode(node, level);
        });
    });

    return markdownOutput;
}

module.exports = {
    compileMarkdown
};