const baseParse = function(content) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context))
}

const parseChildren = function(context) {
  const nodes = []

  let node;
  if(context.source.startsWith("{{")) {
    node = parseInterpolation(context)
  }
  nodes.push(node)
  return nodes
}

// {{ message }}
const parseInterpolation = function(context) {
  const openDelimiter = "{{"
  const closeDelimiter = "}}"

  // 查找到结束括号的位置
  // closeIndex = 11
  const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)
  // 截取字符串 message }}
  advanceBy(context, openDelimiter.length)

  // 获取除{{和}}外的总长度
  // rawContentLength = 9
  const rawContentLength = closeIndex - closeDelimiter.length
  // rawContent = 空格message空格
  const rawContent = context.source.slice(0, rawContentLength)
  // content = message
  const content = rawContent.trim()

  advanceBy(context, rawContentLength + closeDelimiter.length)

  return {
    type: NodeType.INTERPOLATION,
    content: {
      type: NodeType.SIMPLE_EXPRESSION,
      content: content
    }
  }
}

const advanceBy = function(context, length) {
  // 从length开始向后截取全部
  context.source = context.source.slice(length)
}

const createRoot = function(children) {
  return {
    children
  }
}

const createParserContext = function(context) {
  return {
    source: context
  }
}

// const ast = {
//   children: [
//     {
//       type: NodeTypes.INTERPOLATION,
//       content: {
//         type: NodeTypes.SIMPLE_EXPRESSION,
//         content: "message",
//       }
//     }
//   ]
// }


