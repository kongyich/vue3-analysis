// return function render(_ctx, _cache, $props, $setup, $data, $options) {
//   return "hello "
// }
const isString = (value) => typeof value === "string"

const generate = function (ast) {
  // 全局对象及拼接方法
  const context = createCodegenContext()
  const {
    splicing
  } = context
  // splicing('return')

  genFunctionPreamble(ast, context)

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
    case NodeType.ELEMENT:
      genElement(node, context)
      break
    case NodeType.COMPOUND_EXPRESSION:
      genCompoundExpression(node, context)
      break

    default:
      break;
  }
}

const genElement = function(node, context) {
  const { splicing, helper } = context
  const { tag, children, props } = node
  splicing(`${helper(CREATE_ELEMENT_VNODE)}(`)
  genNodeList(genNullable([tag, props, children]), context)
  splicing(')')
}

const genNullable = function(args) {
  return args.map(arg => arg || "null")
}

const genNodeList = function(nodes, context) {
  const { splicing } = context
  for(let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    if(isString(node)) {
      splicing(node)
    } else {
      genNode(node, context)
    }

    if(i < nodes.length - 1) {
      splicing(', ')
    }
  }
}

const genCompoundExpression = function(node, context) {
  const { splicing } = context
  const children = node.children
  for(let i = 0; i < children.length; i++) {
    const child = children[i]
    if(isString(child)) {
      splicing(child)
    } else {
      genNode(child, context)
    }
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
const CREATE_ELEMENT_VNODE = Symbol("createElementVNode")

const helperMapName = {
  [TO_DISPLAY_STRING]: "toDisplayString",
  [CREATE_ELEMENT_VNODE]: "createElementVNode"
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
  if(ast.helpers.length > 0) {
    splicing(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`)
  }
  splicing('\n')
  splicing('return ')

}

function isText(node) {
  return (
    node.type === NodeType.TEXT || node.type === NodeType.INTERPOLATION
  );
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


const transformElement = function(node, context) {
  if(node.type === NodeType.ELEMENT) {
    return () => {
      // tag
      const vnodeTag = `'${node.tag}'`

      // props
      let vnodeProps

      // children
      const children = node.children
      let vnodeChildren = children[0]

      node.codegenNode = creatVNodeCall(
        context,
        vnodeTag,
        vnodeProps,
        vnodeChildren
      )
    }
  }
}

const transformText = function(node) {
  if (node.type === NodeType.ELEMENT) {
  return () => {
    const { children } = node

    let currentContainer
    for(let i = 0; i < children.length; i++) {
      const child = children[i]

      if(isText(child)) {
        for(let j = i + 1; j < children.length; j++) {
          const next = children[j]
          if(isText(next)) {
            if(!currentContainer) {
              currentContainer = children[i] = {
                type: NodeType.COMPOUND_EXPRESSION,
                children: [child]
              }
            }

            currentContainer.children.push(' + ')
            currentContainer.children.push(next)
            children.splice(j, 1)
          } else {
            currentContainer = undefined
            break
          }
        }
      }
    }
  }
}
}
