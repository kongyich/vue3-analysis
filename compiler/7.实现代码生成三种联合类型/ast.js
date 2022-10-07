const NodeType = {
  INTERPOLATION: "interpolation",
  SIMPLE_EXPRESSION: "simple_expression",
  ELEMENT: "element",
  TEXT: "text",
  COMPOUND_EXPRESSION: "compound_expression",

  ROOT: "root"
}


const creatVNodeCall = function(context, tag, props, children) {
  context.helper(CREATE_ELEMENT_VNODE)

  return {
    type: NodeType.ELEMENT,
    tag,
    props,
    children
  }
}
