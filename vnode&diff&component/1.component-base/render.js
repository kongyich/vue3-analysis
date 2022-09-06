const App = {
  setup() {},
  render() {
    return h('div', {}, 'hello pino')
  },
}

const createApp = function(rootComponent) {
  return {
    mount(container) {
      const vnode = createVNode(rootComponent)
      console.log(vnode);
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
  processComponent(vnode, container)
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
