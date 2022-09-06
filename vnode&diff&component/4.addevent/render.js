const App = {
  setup() {
    console.log(this.$el);
    return {
      msg: 'one',
    }
  },
  render() {
    return h('div', { 
      id: 'box', 
      onClick() {
        console.log("触发了click~~");
      }, 
    }, 'we are ' + this.msg + '!')
  },
}

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

// 渲染
const render = function (vnode, container) {
  patch(vnode, container)
}

// vnode对比
const patch = function (vnode, container) {
  console.log(vnode);
  const { shapeFlag } = vnode

  // patch修改位运算
  // if(typeof vnode.type === 'string') {
  //   processElement(vnode, container)
  // } else {
  //   processComponent(vnode, container)
  // }
  if (shapeFlag & ShapeFlags.ELEMENT) {
    processElement(vnode, container)
  } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
    processComponent(vnode, container)
  }
}

const processElement = function (vnode, container) {
  mountElement(vnode, container)
}

const mountElement = function (vnode, container) {
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, props, shapeFlag } = vnode

  // children
  // children修改位运算
  // if(typeof children === 'string') {
  //   el.textContent = children
  // } else {
  //   mountChildren(children, el)
  // }
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
  const subTree = instance.render.call(proxy) // 修改

  patch(subTree, container)

  vnode.el = subTree.el;
}

const dom = document.querySelector("#app")
createApp(App).mount(dom)
