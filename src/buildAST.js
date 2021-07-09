// @flow
const fs = require('fs');
const { parse } = require('@babel/parser');
const { default: traverse } = require('@babel/traverse');
const { parse: parseComment } = require('comment-parser/lib');

const defaultScopeASTIndex = '_default';

export type Parameter = {
    name: string,
    type: string,
    optional: boolean,
    description: string,
    sources: Array<Object>
};

class DocNode {
    name: string;

    description: string;

    parameters: Array<Parameter>;

    returns: ?Parameter;

    sources: Array<?Object>;

    declarationType: "module" | "class" | "function";

    constructor(options: {
        name: string,
        description: string,
        tags: Array<Object>,
        source: Array<Object>,
        nodeType: "module" | "class" | "function"
    }) {
        const {name, description, tags, nodeType, source} = options;
        this.name = name;
        this.description = description;
        this.declarationType = nodeType;
        this.sources = source;
        this.parameters = [];
        tags.forEach((tag) => {
            switch(tag.tag) {
                case 'param':
                    this.parameters.push({
                        name: tag.name,
                        type: tag.type,
                        optional: tag.optional,
                        description: tag.description,
                        sources: tag.source
                    });
                    break;
                case 'return':
                    this.returns = {
                        name: '',
                        type: tag.type,
                        optional: tag.optional,
                        description: `${tag.name} ${tag.description}`,
                        sources: tag.source
                    };
                    break;
                default:
                    break;
            }
        });
    }
}

export type DocAST = [?DocNode, Array<DocNode>];

async function buildAST(indexes: Array<string>|string): Promise<Map<string, DocAST>> {
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
    const docASTByIndexes: Map<string, DocAST> = new Map();
    const defaultScopeAST: DocAST = [null, []];
    docASTByIndexes.set(defaultScopeASTIndex, defaultScopeAST);
    const processComments = (index: string) => {
        const ast = parse(readSourceFromFile(index), babelOpts);
        const modulePathTypes = ['ModuleDeclaration', 'ClassDeclaration'];
        const functionPathTypes = ['FunctionDeclaration', 'ClassMethod'];
        const getNodeName = (node) => node?.key?.name ?? node?.id?.name;
        traverse(ast, {
            enter(path) {
                for (const nodeClass of [...modulePathTypes, ...functionPathTypes]) {
                    if (path[`is${nodeClass}`]()) {
                        const nodeName = getNodeName(path.node);
                        const parsedComments = path.node?.leadingComments?.map((commentBlock) => {
                            const parsed = parseComment(`/*${commentBlock.value}\n*/`);
                            return parsed[0];
                        }) ?? [];
                        if (parsedComments.length === 0) {
                            break;
                        }
                        const nodeType = path.type.indexOf('Declaration') !== -1 ? path.type.split('Declaration')[0].toLowerCase() : 'function';
                        const docNode = new DocNode({
                            name: nodeName,
                            nodeType,
                            ...parsedComments[0]
                        })
                        if (nodeType === 'function') {
                            const parentPath = path.findParent((parentCandidate) => parentCandidate.isClassDeclaration() || parentCandidate.isModuleDeclaration());
                            const parentNodeName = getNodeName(parentPath?.node);
                            const docASTNode: DocAST = docASTByIndexes.get(parentNodeName) ?? defaultScopeAST;
                            docASTNode[1].push(docNode);
                        } else {
                            docASTByIndexes.set(nodeName, [docNode, []]);
                        }
                        break;
                    }
                }
            },
        });
    }
    if (typeof indexes === 'string') {
        processComments(indexes);
    } else {
        indexes.forEach(processComments);
    }

    return docASTByIndexes;
}

module.exports = {
    buildAST,
    DocNode,
    defaultScopeASTIndex
}