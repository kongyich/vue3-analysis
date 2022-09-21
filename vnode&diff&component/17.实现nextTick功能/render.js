
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

const renderSlots = function (slots, name, props) {
  const slot = slots[name]

  if (slot) {
    if (typeof slot === 'function') {
      return slot(props)
    }
  }
}

const createTextVNode = function (text) {
  return createVNode(Text, {}, text)
}

// 渲染
const render = function (vnode, container) {
  patch(null, vnode, container, null, null)
}

// vnode对比
const Fragment = Symbol("Fragment");
const Text = Symbol("Text");
const patch = function (n1, n2, container, parentComponent, anchor) {

  const { type, shapeFlag } = n2

  switch (type) {
    case Fragment:
      processFragment(n1, n2, container, parentComponent, anchor);
      break
    case Text:
      processText(n1, n2, container);
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, parentComponent, anchor)
      } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        processComponent(n1, n2, container, parentComponent, anchor)
      }
      break
  }
}

const processFragment = function (n1, n2, container, parentComponent, anchor) {
  mountChildren(n2.children, container, parentComponent, anchor)
}

const processText = function (n1, n2, container) {
  const { children } = n2
  const textVNode = (n2.el = document.createTextNode(children))
  container.append(textVNode)
}

const processElement = function (n1, n2, container, parentComponent, anchor) {
  if (!n1) {
    mountElement(n2, container, parentComponent, anchor)
  } else {
    patchElement(n1, n2, container, parentComponent, anchor)
  }
}

const EMPTY_OBJ = {}

const patchElement = function (n1, n2, container, parentComponent, anchor) {

  const oldProps = n1.props || EMPTY_OBJ
  const newProps = n2.props || EMPTY_OBJ

  const el = (n2.el = n1.el)
  // children update
  patchChildren(n1, n2, el, parentComponent, anchor)
  // props update
  patchProps(el, oldProps, newProps)
}
const patchChildren = function (n1, n2, container, parentComponent, anchor) {

  const prevShapFlag = n1.shapeFlag
  const c1 = n1.children
  const c2 = n2.children
  const { shapeFlag } = n2

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 当前children为text
    if (prevShapFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 之前children为array
      unmountChildren(n1.children)
    }

    if (c1 !== c2) {
      setElementText(container, c2)
    }
  } else {
    // 当前children为array
    if (prevShapFlag & ShapeFlags.TEXT_CHILDREN) {
      setElementText(container, "")
      mountChildren(c2, container, parentComponent, anchor)
    } else {
      // Array -> Array
      // diff children
      patchKeyedChildren(c1, c2, container, parentComponent, anchor)
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

  // console.log(i); // 3
  // console.log(e1); // 2
  // console.log(e2); // 4

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
      remove(c1[i].el);
      i++;
    }
  } else {
    // 中间对比
    let s1 = i
    let s2 = i

    const toBePatched = e2 - s2 + 1
    let patched = 0
    const keyToNewIndexMap = new Map()

    let moved = false 
    let maxNewIndexSoFar = 0 
    const newIndexToOldIndexMap = new Array(toBePatched) 
    // 数组补0
    for (let i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0 


    for (let i = s2; i <= e2; i++) {
      let nextChild = c2[i]
      keyToNewIndexMap.set(nextChild.key, i)
    }

    for (let i = s1; i <= e1; i++) {
      const prevChild = c1[i]

      if (patched >= toBePatched) {
        remove(prevChild.el)
        continue
      }

      let newIndex
      if (prevChild.key != null) {
        newIndex = keyToNewIndexMap.get(prevChild.key)
      } else {
        for (let j = s2; j <= e2; j++) {
          if (isSomeVNodeType(prevChild, c2[j])) {
            newIndex = j
            break
          }
        }
      }

      if (newIndex === undefined) {
        remove(prevChild.el)
      } else {
        if (newIndex >= maxNewIndexSoFar) { 
          maxNewIndexSoFar = newIndex 
        } else { 
          moved = true 
        } 

        newIndexToOldIndexMap[newIndex - s2] = i + 1 

        patch(prevChild, c2[newIndex], container, parentComponent, null)
        patched++
      }


    }
    const increasingNewIndexSequence = moved ? getSequence(newIndexToOldIndexMap) : []

    let j = increasingNewIndexSequence.length - 1
    for (let i = toBePatched - 1; i >= 0; i--) {
      const nextIndex = i + s2
      const nextChild = c2[nextIndex]
      const anchor = nextIndex + 1 < l2 ? c2[nextIndex + 1].el : null
      if (newIndexToOldIndexMap[i] === 0) {
        patch(null, nextChild, container, parentComponent, anchor)
      } else if (moved) {
        if (j < 0 || increasingNewIndexSequence[j] !== i) {
          insert(container, nextChild.el, anchor)
        } else {
          j--
        }
      }

    }
  }
}

function getSequence(arr) {
  const p = arr.slice();
  const result = [0];
  let i, j, u, v, c;
  const len = arr.length;
  for (i = 0; i < len; i++) {
    const arrI = arr[i];
    if (arrI !== 0) {
      j = result[result.length - 1];
      if (arr[j] < arrI) {
        p[i] = j;
        result.push(i);
        continue;
      }
      u = 0;
      v = result.length - 1;
      while (u < v) {
        c = (u + v) >> 1;
        if (arr[result[c]] < arrI) {
          u = c + 1;
        } else {
          v = c;
        }
      }
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1];
        }
        result[u] = i;
      }
    }
  }
  u = result.length;
  v = result[u - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}

const remove = function (child) {
  const parent = child.parentNode

  if (parent) parent.removeChild(child)
}

const unmountChildren = function (children) {
  for (let i = 0; i < children.length; i++) {
    let el = children[i].el

    let parent = el.parentNode
    if (parent) parent.removeChild(el)
  }
}

const setElementText = function (el, text) {
  el.textContent = text
}

const patchProps = function (el, oldProps, newProps) {
  if (oldProps !== newProps) {
    for (let key in newProps) {
      const prevProp = oldProps[key]
      const nextProp = newProps[key]

      if (prevProp !== nextProp) {
        mountProps(el, key, prevProp, nextProp)
      }
    }

    if (oldProps !== EMPTY_OBJ) {
      for (let key in oldProps) {
        if (!(key in newProps)) {
          mountProps(el, key, oldProps[key], null)
        }
      }
    }
  }
}

const mountElement = function (vnode, container, parentComponent, anchor) {
  const el = (vnode.el = document.createElement(vnode.type));
  const { children, props, shapeFlag } = vnode

  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(children, el, parentComponent, anchor)
  }

  // props
  for (const key in props) {
    const prop = props[key]

    mountProps(el, key, null, prop)
  }

  // container.append(el)
  insert(container, el, anchor)
}

const insert = function (parent, child, anchor) {
  // container.append(el)
  parent.insertBefore(child, anchor || null)
}

const mountProps = function (el, key, prevVal, nextVal) {
  const isOn = key => /^on[A-Z]/.test(key)
  // 使用on进行绑定事件
  if (isOn(key)) {
    const event = key.slice(2).toLowerCase()
    el.addEventListener(event, nextVal)
  } else {
    if (nextVal === undefined || nextVal === null) {
      el.removeAttribute(key)
    } else {
      el.setAttribute(key, nextVal)
    }
  }
}

const mountChildren = function (children, container, parentComponent, anchor) {
  children.forEach(v => {
    patch(null, v, container, parentComponent, anchor)
  })
}

const processComponent = function (n1, n2, container, parentComponent, anchor) {
  if(!n1) { 
    mountComponent(n2, container, parentComponent, anchor) 
  } else { 
    updateComponent(n1, n2) 
  } 
}

const updateComponent = function(n1, n2) {
  const instance = (n2.component = n1.component)
  if(shouldUpdateComponent(n1, n2)) {
    instance.next = n2;
    instance.update();
  } else {
    n2.el = n1.el;
    instance.vnode = n2;
  }
}


const shouldUpdateComponent = function(prevVNode, nextVNode) {
  const { props: prevProps } = prevVNode;
  const { props: nextProps } = nextVNode;

  for (const key in nextProps) {
    if (nextProps[key] !== prevProps[key]) {
      return true;
    }
  }

  return false;
}

const mountComponent = function (vnode, container, parentComponent, anchor) {
  // 创建组件实例
  const instance = (vnode.component = createComponentInstance(vnode, parentComponent)) 

  setupComponent(instance)
  setupRenderEffect(instance, vnode, container, anchor)
}

const setupRenderEffect = function (instance, vnode, container, anchor) {
    instance.update = effect(() => { 
      if (!instance.isMounted) {
        console.log("init");
        const { proxy } = instance;
        const subTree = (instance.subTree = instance.render.call(proxy));
  
        patch(null, subTree, container, instance, anchor);
        vnode.el = subTree.el;
        instance.isMounted = true;
      } else {
        console.log("update");
  
        const { next, vnode } = instance 
        if(next) { 
          next.el = vnode.el 
   
          updateComponentPreRender(instance, next) 
        } 
  
        const { proxy } = instance
        const subTree = instance.render.call(proxy)
        const prevSubTree = instance.subTree
  
        instance.subTree = subTree;
        patch(prevSubTree, subTree, container, instance, anchor)
      }
  }, {
    scheduler() {
      queueJobs(instance.update);
    }
  })
}

const updateComponentPreRender = function(instance, nextVNode) {
  instance.vnode = nextVNode
  instance.next = null
  
  instance.props = nextVNode.props
} 

const provide = function (key, value) {
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

const inject = function (key, defaultValue) {
  const currentInstance = getCurrentInstance();

  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides;

    if (key in parentProvides) {
      return parentProvides[key];
    } else if (defaultValue) {
      if (typeof defaultValue === "function") {
        return defaultValue()
      }
      return defaultValue
    }
  }
}

const queue = []
const p = Promise.resolve()
let isFlushPending = false

const queueJobs = job => {
  if(!queue.includes(job)) {
    queue.push(job)
  }

  queueFlush()
}

const queueFlush = () => {
  if(isFlushPending) return
  isFlushPending = true

  nextTick(flushJobs)
}

const flushJobs = () => {
  isFlushPending = false
  let job
  while((job = queue.shift())) {
    job && job()
  }
}

const nextTick = fn => {
  return fn ? p.then(fn) : p
}





// component props update
const App = {
  setup() {
    let count = reactive({
      value: 0
    })
    
    let changeCount = function() {
      for(let i = 0; i < 10; i++) {
        count.value = count.value + 1
      }

      nextTick(()=>{
        const instance = getCurrentInstance()
      })
    }

    return {
      count,
      changeCount
    }
  },
  render() {
    return h('div', {}, [
      h('p', {}, `count： ${this.count.value}`),
      h('button', { onClick: this.changeCount }, 'update')
    ])
  }
}

const dom = document.querySelector("#app")
createApp(App).mount(dom)
