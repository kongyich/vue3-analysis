// return function render(_ctx, _cache, $props, $setup, $data, $options) {
//   return "hello "
// }


const generate = function (ast) {
  // 全局对象及拼接方法
  const context = createCodegenContext()
  const {
    splicing
  } = context
  splicing('return')

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
  const {
    splicing
  } = context
  splicing(`${node.content}`)
}

const createCodegenContext = function () {
  const context = {
    code: '',
    splicing(source) {
      context.code += source
    }
  }
  return context
}
