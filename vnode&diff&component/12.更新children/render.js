
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
  patch(null, vnode, container, null) 
}

// vnode对比
const Fragment = Symbol("Fragment"); 
const Text = Symbol("Text");
const patch = function (n1, n2, container, parentComponent) {

  const { type, shapeFlag } = n2 

  switch(type) {
    case Fragment:
      processFragment(n1, n2, container, parentComponent);
      break
    case Text:
      processText(n1, n2, container);
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, parentComponent) 
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(n1, n2, container, parentComponent)
      }
      break
  }
}

const processFragment = function(n1, n2, container, parentComponent) { 
  mountChildren(n2.children, container, parentComponent) 
}

const processText = function(n1, n2, container) { 
  const { children } = n2  
  const textVNode = (n2.el = document.createTextNode(children)) 
  container.append(textVNode) 
}

const processElement = function (n1, n2, container, parentComponent) { 
  if(!n1) {
    mountElement(n2, container, parentComponent) 
  } else { 
    patchElement(n1, n2, container, parentComponent) 
  }
}

const EMPTY_OBJ = {}

const patchElement = function(n1, n2, container, parentComponent) {

  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ

  const el = (n2.el = n1.el)
  // children update
  patchChildren(n1, n2, container, parentComponent) // 修改
  // props update
  patchProps(el, oldProps, newProps)
}
// add
const patchChildren = function(n1, n2, container, parentComponent) {
  
  const prevShapFlag = n1.shapeFlag
  const c1 = n1.children
  const c2 = n2.children
  const { shapeFlag } = n2

  if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 当前children为text
    if(prevShapFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 之前children为array
      unmountChildren(n1.children)
    }

    if(c1 !== c2) {
      setElementText(container, c2)
    }
  } else {
    // 当前children为array
    if(prevShapFlag & ShapeFlags.TEXT_CHILDREN) {
      setElementText(container, "")
      mountChildren(c2, container, parentComponent)
    }
  }
}

// add
const unmountChildren = function(children) {
  for(let i = 0; i < children.length; i++) {
    let el = children[i].el

    let parent = el.parentNode
    if(parent) parent.removeChild(el)
  }
}

// add
const setElementText = function(el, text) {
  el.textContent = text
}

const patchProps = function(el, oldProps, newProps) {
  if(oldProps !== newProps) {
    for(let key in newProps) {
      const prevProp = oldProps[key]
      const nextProp = newProps[key]

      if(prevProp !== nextProp) {
        mountProps(el, key, prevProp, nextProp)
      }
    }

    if(oldProps !== EMPTY_OBJ) {
      for(let key in oldProps) {
        if(!(key in newProps)) {
          mountProps(el, key, oldProps[key], null)
        }
      }
    }
  }
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

    mountProps(el, key, null, prop)
  }

  container.append(el)
}

const mountProps = function(el, key, prevVal, nextVal) {
  const isOn = key => /^on[A-Z]/.test(key)
  // 使用on进行绑定事件
  if(isOn(key)) {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, nextVal)
  } else {
    if(nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextVal)
    }
  }
}

const mountChildren = function (children, container, parentComponent) {
  children.forEach(v => {
    patch(null, v, container, parentComponent)
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

// ex1 Array -> String
// const prevChild = [h("div", {}, "A"), h("div", {}, "B")];
// const nextChild = "newChildren";

// ex2 Text -> Array
const prevChild = "oldChildren"
const nextChild = [h("div", {}, "A"), h("div", {}, "B")];
// ex3 Text -> Text
// const prevChild = "oldChildren"
// const nextChild = "newChildren"

const App = {
  setup() {
    const isChange = reactive({
      value: false
    })
    window.isChange = isChange;

    return {
      isChange
    }
  },

  render() {
    let self = this

    return self.isChange.value === true ? 
          h('div', {}, nextChild) :
          h('div', {}, prevChild)
  }
}

const dom = document.querySelector("#app")
createApp(App).mount(dom)

