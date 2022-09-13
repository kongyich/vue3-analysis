const App = {
  setup() {
    let value = reactive({
      count: 0
    })

    const changeCount = ()=>{
      value.count = value.count + 1
    }

    return {
      value,
      changeCount
    }
  },
  render() {
    return h('div', { id: 'root' }, [
      h('p', {}, 'count：' + this.value.count),
      h('button', { onClick: this.changeCount, }, 'change')
    ])
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
  patch(null, vnode, container, null) // 修改
}

// vnode对比
const Fragment = Symbol("Fragment"); 
const Text = Symbol("Text");
const patch = function (n1, n2, container, parentComponent) { // 修改

  const { type, shapeFlag } = n2 // 修改

  switch(type) {
    case Fragment:
      processFragment(n1, n2, container, parentComponent); // 修改
      break
    case Text:
      processText(n1, n2, container); // 修改
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, parentComponent) // 修改
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(n1, n2, container, parentComponent) // 修改
      }
      break
  }
}

const processFragment = function(n1, n2, container, parentComponent) { // 修改
  mountChildren(n2.children, container, parentComponent) // 修改
}

const processText = function(n1, n2, container) { // 修改
  const { children } = n2  // 修改
  const textVNode = (n2.el = document.createTextNode(children)) // 修改
  container.append(textVNode) 
}

const processElement = function (n1, n2, container, parentComponent) { // 修改
  if(!n1) { // 修改
    mountElement(n2, container, parentComponent)  // 修改
  } else { // 修改
    patchElement(n1, n2, container) // 修改
  }
}

const patchElement = function(n1, n2, container) {
  console.log(n1);
  console.log(n2);
}

const mountElement = function (vnode, container, parentComponent) {
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, props, shapeFlag } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el, parentComponent)
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

const mountChildren = function (children, container, parentComponent) {
  children.forEach(v => {
    patch(null, v, container, parentComponent) // 修改
  })
}

const processComponent = function (n1, n2, container, parentComponent) {
  mountComponent(n2, container, parentComponent)
}

const mountComponent = function (vnode, container, parentComponent) {
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)

  setupComponent(instance)
  setupRenderEffect(instance, vnode, container)
}

// 修改
const setupRenderEffect = function (instance, vnode, container) {

  effect(()=>{
    if(!instance.isMounted) {
      console.log("init");
      const { proxy } = instance;
      const subTree = (instance.subTree = instance.render.call(proxy));

      patch(null, subTree, container, instance);

      vnode.el = subTree.el;

      instance.isMounted = true;
    } else {
      console.log("update");

      const { proxy } = instance
      const subTree = instance.render.call(proxy)
      const prevSubTree = instance.subTree

      instance.subTree = subTree;
      patch(prevSubTree, subTree, container, instance)

    }
  })
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
