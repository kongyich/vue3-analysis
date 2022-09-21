// 创建vnode
const createVNode = function (type, props, children) {
  const vnode = {
    type,
    props,
    children,
    component: null,
    key: props && props.key,
    shapeFlag: getShapeFlag(type),
    el: null,
  }

  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
  }

  if(vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    if(typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOT_CHILDREN
    }
  }

  return vnode
}

const ShapeFlags = {
  ELEMENT: 1,
  STATEFUL_COMPONENT: 1 << 1,
  TEXT_CHILDREN: 1 << 2,
  ARRAY_CHILDREN: 1 << 3,
  SLOT_CHILDREN: 1 << 4
}

const getShapeFlag = function (type) {
  return typeof type === 'string' ? ShapeFlags.ELEMENT : ShapeFlags.STATEFUL_COMPONENT
}

