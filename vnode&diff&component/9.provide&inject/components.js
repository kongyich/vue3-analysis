const createComponentInstance = function (vnode, parent) { // 修改
  const component = {
    vnode,
    type: vnode.type,
    props: {},
    setupState: {},
    provides: parent ? parent.provides : {}, // 修改
    parent: parent ? parent : {}, // 修改
    slots: {},
    emit: () => {} 
  }

  component.emit = emit.bind(null, component)

  return component
}

const setupComponent = function (instance) {
  const { vnode, slots } = instance
  // 初始化slots
  if(vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    normalizeObjectSlots(vnode.children, slots) 
  } 

  // 初始化props
  instance.props = vnode.props || {}
  setupStatefulComponent(instance)
}

const normalizeObjectSlots = function(children, slots) { 
  for(let key in children) { 
    const value = children[key]
    slots[key] = props => value(props)
  } 
}

const normalizeSlotValue = function(value) { 
  return Array.isArray(value) ? value : [value]
} 


const publicPropertiesMap = {
  $el: i => i.vnode.el,
  $slots: i => i.slots,
}

const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance

    const hasOwn = (val, key) =>
      Object.prototype.hasOwnProperty.call(val, key);
    if (hasOwn(setupState, key)) {
      return setupState[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    }

    const publicGetter = publicPropertiesMap[key];
    if (publicGetter) {
      return publicGetter(instance);
    }
  }
}

let currentInstance = null;

const setupStatefulComponent = function (instance) {
  const component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  const { setup } = component

  if (setup) {
    setCurrentInstance(instance)
    const setupResult = setup(instance.props, { 
      emit: instance.emit
    });
    setCurrentInstance(null)
    handleSetupResult(instance, setupResult)
  }
}

const getCurrentInstance = function() {
  return currentInstance;
}

const setCurrentInstance =  function(instance) {
  currentInstance = instance;
}

const handleSetupResult = function (instance, setupResult) {
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult
  }

  instance.render = instance.type.render;
}

const emit = function (instance, event, ...args) {
  const { props } = instance
  const handlerName = toHandlerKey(camelize(event))
  const handler = props[handlerName]
  handler && handler(...args)
}

const toHandlerKey = function (str) {
  return str ? 'on' + capitalize(str) : ''
}

const capitalize = function(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

const camelize = function(str) {
  return str.replace(/-(\w)/g, (_, c) => {
    return c ? c.toUpperCase() : ''
  })
}
