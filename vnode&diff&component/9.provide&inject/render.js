const App = {
  name: 'App',
  setup() {
    provide('name', 'pino')
    provide('age', 18)
  },
  render() {
    return h('div', {}, [
      h('p', {}, 'App'),
      h(Son)
    ])
  }
}

const Son = {
  name: 'Son',
  setup() {
    provide('name', 'momo')
    const name = inject('name')

    return {
      name
    }
  },
  render() {
    return h('div', {}, [
      h('p', {}, `Son -> name: ${this.name}`),
      h(Grandson)
    ])
  }
}

const Grandson = {
  name: 'Grandson',
  setup() {
    const name = inject('name')
    const age = inject('age')
    const addr = inject("addr", () => "火星");
    return {
      name,
      age,
      addr
    }
  },
  render() {
    return h('div', {}, `Grandson -> name:${this.name} age:${this.age} addr:${this.addr}`)
  }
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

const renderSlots = function(slots, name, props) {
  const slot = slots[name]

  if(slot) {
    if(typeof slot === 'function') { 
      return slot(props)
    } 
  }
}

const createTextVNode = function(text) {
  return createVNode(Text, {}, text)
} 

// 渲染
const render = function (vnode, container) {
  patch(vnode, container, null) // 修改
}

// vnode对比
const Fragment = Symbol("Fragment"); 
const Text = Symbol("Text");
const patch = function (vnode, container, parentComponent) { // 修改

  const { type, shapeFlag } = vnode

  switch(type) {
    case Fragment:
      processFragment(vnode, container, parentComponent);
      break
    case Text:
      processText(vnode, container);
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(vnode, container, parentComponent) // 修改
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(vnode, container, parentComponent) // 修改
      }
      break
  }
}

const processFragment = function(vnode, container, parentComponent) { // 修改
  mountChildren(vnode.children, container, parentComponent)  // 修改
}

const processText = function(vnode, container) {
  const { children } = vnode 
  const textVNode = (vnode.el = document.createTextNode(children))
  container.append(textVNode) 
}

const processElement = function (vnode, container, parentComponent) { // 修改
  mountElement(vnode, container, parentComponent) // 修改
}

const mountElement = function (vnode, container, parentComponent) { // 修改
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, props, shapeFlag } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el, parentComponent) // 修改
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

const mountChildren = function (children, container, parentComponent) { // 修改
  children.forEach(v => {
    patch(v, container, parentComponent) // 修改
  })
}

const processComponent = function (vnode, container, parentComponent) { // 修改
  mountComponent(vnode, container, parentComponent) // 修改
}

const mountComponent = function (vnode, container, parentComponent) { // 修改
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent) // 修改

  setupComponent(instance)
  setupRenderEffect(instance, vnode, container)
}

const setupRenderEffect = function (instance, vnode, container) {
  const { proxy } = instance
  const subTree = instance.render.call(proxy)
  patch(subTree, container, instance) // 修改

  vnode.el = subTree.el;
}

const provide = function(key, value) {
  const currentInstance = getCurrentInstance();

  if (currentInstance) {
    let { provides } = currentInstance;
    const parentProvides = currentInstance.parent.provides;

    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides);
    }

    provides[key] = value;
  }
}

const inject = function(key, defaultValue) {
  const currentInstance = getCurrentInstance();

  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;

    if (key in parentProvides) {
      return parentProvides[key];
    }else if(defaultValue){
      if(typeof defaultValue === "function"){
        return defaultValue()
      }
      return defaultValue
    }
  }
}

const dom = document.querySelector("#app")
createApp(App).mount(dom)
