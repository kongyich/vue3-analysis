const baseParse = function(content) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context, []))
}

const transform = function(root, options) {
  const context = createTransformContext(root, options)
  transNode(root, context)
}

const createTransformContext = function(root, options) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || []
  }

  return context
}

const transNode = function(node, context) {
  const nodeTransforms = context.nodeTransforms

  for(let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform && transform(node)
  }

  traverseChildren(node, context)
}

const traverseChildren = function(node, context) {
  const children = node.children

  if(children) {
    for(let i = 0; i < children.length; i++) {
      const node = children[i]
      transNode(node, context)
    }
  }
}

const parseChildren = function(context, ancestors) {
  const nodes = []

  while(!isEnd(context, ancestors)) {
    let node;
    let s = context.source
    if(s.startsWith("{{")) {
      node = parseInterpolation(context)
    } else if(s[0] === '<') {
      if(/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    }

    if(!node) {
      node = parseText(context)
    }

    nodes.push(node)
  }

  return nodes
}

const isEnd = function(context, ancestors) {
  const s = context.source
  if(s.startsWith("</")) {
    let tag = ancestors[ancestors.length - 1].tag
    if(startsWithEndTagOpen(s, tag)) {
      return true
    }
    // for(let i = ancestors.length - 1; i >= 0; i--) {
    //   const tag = ancestors[i].tag
    //   if(startsWithEndTagOpen(s, tag)) {
    //     return true
    //   }
    // }
  }
  return !s
}

const startsWithEndTagOpen = function(source, tag) {
  return source.startsWith('</') && source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
}


const parseText = function(context) {
  let endIndex = context.source.length
  let endTokens = ['<', '{{']

  for(let i = 0; i < endTokens.length; i++) {
    let index = context.source.indexOf(endTokens[i])
    if(index !== -1 && endIndex > index) {
      endIndex = index
    }
  }

  const content = parseTextData(context, endIndex)

  return {
    type: NodeType.TEXT,
    content,
  }
}

const parseTextData = function(context, length) {
  const content = context.source.slice(0, length)

  // 推进
  advanceBy(context, length)
  return content
}

const TagType = {
  START: "start",
  END: "end"
}

const parseElement = function(context, ancestors) {
  const element = parseTag(context, TagType.START)
  ancestors.push(element)
  element.children = parseChildren(context, ancestors);
  ancestors.pop()

  if(startsWithEndTagOpen(context.source, element.tag)) {
    // 解析闭合标签
    parseTag(context, TagType.END)
  } else {
    throw new Error(`缺少结束标签：${element.tag}`)
  }
  return element
}

const parseTag = function(context, type) {
  const match = /^<\/?([a-z]*)/i.exec(context.source)
  const tag = match[1]
  advanceBy(context, match[0].length)
  advanceBy(context, 1)
  if(type === TagType.END) return

  return {
    type: NodeType.ELEMENT,
    tag
  }
}


const parseInterpolation = function(context) {
  const openDelimiter = "{{"
  const closeDelimiter = "}}"

  const closeIndex = context.source.indexOf(closeDelimiter, openDelimiter.length)

  advanceBy(context, openDelimiter.length)
  const rawContentLength = closeIndex - closeDelimiter.length
  const rawContent = parseTextData(context, rawContentLength)

  const content = rawContent.trim()

  advanceBy(context, closeDelimiter.length)

  return {
    type: NodeType.INTERPOLATION,
    content: {
      type: NodeType.SIMPLE_EXPRESSION,
      content: content
    }
  }
}

const advanceBy = function(context, length) {
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


