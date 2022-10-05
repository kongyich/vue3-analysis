// return function render(_ctx, _cache, $props, $setup, $data, $options) {
//   return "hello "
// }


const generate = function (ast) {
  // 全局对象及拼接方法
  const context = createCodegenContext()
  const {
    splicing
  } = context
  // splicing('return')

  genFunctionPreamble(ast, context) // add

  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')

  splicing(`function ${functionName}(${signature}){`)
  splicing('return ')
  genNode(ast.codegenNode, context)
  splicing('}')

  return {
    code: context.code
  }
}

const genNode = function (node, context) {

  switch(node.type) {
    case NodeType.TEXT:
      genText(node, context)
      break
    case NodeType.INTERPOLATION:
      genInterpolation(node, context)
      break
    case NodeType.SIMPLE_EXPRESSION:
      genExpression(node, context)
      break

    default:
      break;
  }
}

const genExpression = function(node, context) {
  const {
    splicing
  } = context
  splicing(`${node.content}`)
}

const genInterpolation = function(node, context) {
  const { splicing, helper } = context

  splicing(`${helper(TO_DISPLAY_STRING)}(`)
  genNode(node.content, context)
  splicing(')')
}

const genText = function(node, context) {
  const { splicing } = context
  splicing(`'${node.content}'`)
}

// add
const TO_DISPLAY_STRING = Symbol("toDisplayString")

const helperMapName = {
  [TO_DISPLAY_STRING]: "toDisplayString"
}

const createCodegenContext = function () {
  const context = {
    code: '',
    splicing(source) {
      context.code += source
    },

    helper(key) {
      return `_${helperMapName[key]}`
    }
  }

  return context
}


const genFunctionPreamble = function (ast, context) {
  const {
    splicing
  } = context
  const VueBinging = 'Vue'
  const aliasHelper = s => `${helperMapName[s]}: _${helperMapName[s]}`
  console.log(ast);
  if(ast.helpers.length > 0) {
    splicing(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`)
  }
  splicing('\n')
  splicing('return ')

}


function transformExpression(node) {
  if (node.type === NodeType.INTERPOLATION) {
    node.content = processExpression(node.content);
  }
}

function processExpression(node) {
  node.content = `_ctx.${node.content}`;
  return node;
}
