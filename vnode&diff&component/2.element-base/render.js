const App = {
  setup() {},
  render() {
    return h('div', { id: 'box' }, 'hello pino!')
  },
}

const h = function(type, props, children) {
  return createVNode(type, props, children)
}

const createApp = function(rootComponent) {
  return {
    mount(container) {
      const vnode = createVNode(rootComponent)
      render(vnode, container)
    }
  }
}

// 渲染
const render = function(vnode, container) {
  patch(vnode, container)
}

// vnode对比
const patch = function(vnode, container) {
  if(typeof vnode.type === 'string') {
    processElement(vnode, container)
  } else {
    processComponent(vnode, container)
  }
}

const processElement = function(vnode, container) {
  mountElement(vnode, container)
}

const mountElement = function(vnode, container) {
  const el = document.createElement(vnode.type)
  const { children, props } = vnode

  // children
  if(typeof children === 'string') {
    el.textContent = children
  } else {
    mountChildren(children, el)
  }

  // props
  for(const key in props) {
    const prop = props[key]
    el.setAttribute(key, prop)
  }

  container.append(el)
}

const mountChildren = function(children, container) {
  children.forEach(v=>{
    patch(v, container)
  })
}

const processComponent = function(vnode, container) {
  mountComponent(vnode, container)
}

const mountComponent = function(vnode, container) {
  // 创建组件实例
  const instance = createComponentInstance(vnode)

  setupComponent(instance)
  setupRenderEffect(instance, container)
}

const setupRenderEffect = function(instance, container) {
  const subTree = instance.render()

  patch(subTree, container)
}

const dom = document.querySelector("#app")
createApp(App).mount(dom)
