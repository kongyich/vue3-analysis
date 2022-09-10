const App = {
  setup() {},
  render() {
    return h(Fragment, { id: 'box' }, [
      h('span', {}, 'span'),
      createTextVNode('App')
    ])
  }
}

// const App = {
//   setup() {},
//   render() {
//     return h('div', {}, [
//       h('span', {}, 'span'),
//       h('p', {}, 'App')
//     ])
//   }
// }

const h = function (type, props, children) {
  return createVNode(type, props, children)
}

const createApp = function (rootComponent) {
  return {
    mount(container) {
      const vnode = createVNode(rootComponent)
      render(vnode, container)
    }
  }
}

const renderSlots = function(slots, name, props) {
  const slot = slots[name]

  if(slot) {
    if(typeof slot === 'function') { 
      return slot(props)
    } 
  }
}

const createTextVNode = function(text) { // 新增
  return createVNode(Text, {}, text) // 新增
} // 新增

// 渲染
const render = function (vnode, container) {
  patch(vnode, container)
}

// vnode对比
const Fragment = Symbol("Fragment"); // 新增
const Text = Symbol("Text"); // 新增
const patch = function (vnode, container) {
  const { type, shapeFlag } = vnode // 修改

  // if (shapeFlag & ShapeFlags.ELEMENT) {
  //   processElement(vnode, container)
  // } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
  //   processComponent(vnode, container)
  // }

  switch(type) {
    case Fragment:
      processFragment(vnode, container);
      break
    case Text:
      processText(vnode, container);
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container)
      }
      break
  }
}

const processFragment = function(vnode, container) { // 新增
  mountChildren(vnode.children, container) // 新增
} // 新增

const processText = function(vnode, container) { // 新增
  const { children } = vnode // 新增
  const textVNode = (vnode.el = document.createTextNode(children)) // 新增
  container.append(textVNode) // 新增 
} // 新增

const processElement = function (vnode, container) {
  mountElement(vnode, container)
}

const mountElement = function (vnode, container) {
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, props, shapeFlag } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el)
  }

  // props
  for (const key in props) {
    const prop = props[key]

    const isOn = key => /^on[A-Z]/.test(key)
    // 使用on进行绑定事件
    if(isOn(key)) {
      const event = key.slice(2).toLowerCase()
      el.addEventListener(event, prop)
    } else {
      el.setAttribute(key, prop)
    }
  }

  container.append(el)
}

const mountChildren = function (children, container) {
  children.forEach(v => {
    patch(v, container)
  })
}

const processComponent = function (vnode, container) {
  mountComponent(vnode, container)
}

const mountComponent = function (vnode, container) {
  // 创建组件实例
  const instance = createComponentInstance(vnode)

  setupComponent(instance)
  setupRenderEffect(instance, vnode, container)
}

const setupRenderEffect = function (instance, vnode, container) {
  const { proxy } = instance
  const subTree = instance.render.call(proxy) 

  patch(subTree, container)

  vnode.el = subTree.el;
}

const dom = document.querySelector("#app")
createApp(App).mount(dom)
