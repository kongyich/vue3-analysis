// 创建vnode
const createVNode = function(type, props, children) {
  const vnode = {
    type,
    props,
    children
  }

  return vnode
}
