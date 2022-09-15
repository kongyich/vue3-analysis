
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
  patch(null, vnode, container, null, null)  // 修改
}

// vnode对比
const Fragment = Symbol("Fragment"); 
const Text = Symbol("Text");
const patch = function (n1, n2, container, parentComponent, anchor) { // 修改

  const { type, shapeFlag } = n2 

  switch(type) {
    case Fragment:
      processFragment(n1, n2, container, parentComponent, anchor); // 修改
      break
    case Text:
      processText(n1, n2, container);
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, parentComponent, anchor)  // 修改
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(n1, n2, container, parentComponent, anchor) // 修改
      }
      break
  }
}

const processFragment = function(n1, n2, container, parentComponent, anchor) {  // 修改
  mountChildren(n2.children, container, parentComponent, anchor)  // 修改
}

const processText = function(n1, n2, container) { 
  const { children } = n2  
  const textVNode = (n2.el = document.createTextNode(children)) 
  container.append(textVNode) 
}

const processElement = function (n1, n2, container, parentComponent, anchor) {  // 修改
  if(!n1) {
    mountElement(n2, container, parentComponent, anchor)  // 修改
  } else { 
    patchElement(n1, n2, container, parentComponent, anchor)  // 修改
  }
}

const EMPTY_OBJ = {}

const patchElement = function(n1, n2, container, parentComponent, anchor) { // 修改

  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ

  const el = (n2.el = n1.el)
  // children update
  patchChildren(n1, n2, container, parentComponent, anchor) // 修改
  // props update
  patchProps(el, oldProps, newProps)
}
const patchChildren = function(n1, n2, container, parentComponent, anchor) { // 修改
  
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
      mountChildren(c2, container, parentComponent, anchor) // 修改
    } else {
      // Array -> Array
      // diff children
      patchKeyedChildren(c1, c2, container, parentComponent, anchor) // 修改
    }
  }
}

function patchKeyedChildren(
  c1,
  c2,
  container,
  parentComponent,
  parentAnchor
) {
  const l2 = c2.length;
  let i = 0;
  let e1 = c1.length - 1;
  let e2 = l2 - 1;

  function isSomeVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
  }

  while (i <= e1 && i <= e2) {
    const n1 = c1[i];
    const n2 = c2[i];

    if (isSomeVNodeType(n1, n2)) {
      patch(n1, n2, container, parentComponent, parentAnchor);
    } else {
      break;
    }

    i++;
  }

  while (i <= e1 && i <= e2) {
    const n1 = c1[e1];
    const n2 = c2[e2];

    if (isSomeVNodeType(n1, n2)) {
      patch(n1, n2, container, parentComponent, parentAnchor);
    } else {
      break;
    }

    e1--;
    e2--;
  }

  if (i > e1) {
    if (i <= e2) {
      const nextPos = e2 + 1;
      const anchor = nextPos < l2 ? c2[nextPos].el : null;
      while (i <= e2) {
        patch(null, c2[i], container, parentComponent, anchor);
        i++;
      }
    }
  } else if (i > e2) {
    while (i <= e1) {
      hostRemove(c1[i].el);
      i++;
    }
  } else {}
}

const unmountChildren = function(children) {
  for(let i = 0; i < children.length; i++) {
    let el = children[i].el

    let parent = el.parentNode
    if(parent) parent.removeChild(el)
  }
}

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

const mountElement = function (vnode, container, parentComponent, anchor) { // 修改
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, props, shapeFlag } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el, parentComponent, anchor) // 修改
  }

  // props
  for (const key in props) {
    const prop = props[key]

    mountProps(el, key, null, prop)
  }

  // container.append(el)
  insert(el, container, anchor)  // 修改
}

// add
const insert = function(child, parent, anchor) {
  parent.insertBefore(child, anchor || null)
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

const mountChildren = function (children, container, parentComponent,anchor) { // 修改
  children.forEach(v => {
    patch(null, v, container, parentComponent, anchor) // 修改
  })
}

const processComponent = function (n1, n2, container, parentComponent, anchor) {  // 修改
  mountComponent(n2, container, parentComponent, anchor)  // 修改
}

const mountComponent = function (vnode, container, parentComponent, anchor) {  // 修改
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)

  setupComponent(instance)
  setupRenderEffect(instance, vnode, container, anchor)  // 修改
}

const setupRenderEffect = function (instance, vnode, container, anchor) {  // 修改

  effect(()=>{
    if(!instance.isMounted) {
      console.log("init");
      const { proxy } = instance;
      const subTree = (instance.subTree = instance.render.call(proxy));

      patch(null, subTree, container, instance, anchor);  // 修改
      vnode.el = subTree.el;
      instance.isMounted = true;
    } else {
      console.log("update");

      const { proxy } = instance
      const subTree = instance.render.call(proxy)
      const prevSubTree = instance.subTree

      instance.subTree = subTree;
      patch(prevSubTree, subTree, container, instance, anchor)  // 修改

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

// ex Arrxy -> Array
// (a b) c
// (a b) d e
const prevChild = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
];
const nextChild = [
  h("p", { key: "A" }, "A"),
  h("p", { key: "B" }, "B"),
  h("p", { key: "C" }, "C"),
  h("p", { key: "E" }, "E"),
];

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

