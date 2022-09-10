const createComponentInstance = function (vnode) {
  const component = {
    vnode,
    type: vnode.type,
    props: {},
    setupState: {},
    slots: {}, // 新增
    emit: () => {} 
  }

  component.emit = emit.bind(null, component)

  return component
}

const setupComponent = function (instance) {
  const { vnode, slots } = instance
  // 初始化slots
  if(vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) { // 新增
    normalizeObjectSlots(vnode.children, slots) // 新增
  } // 新增

  // 初始化props
  instance.props = vnode.props || {}
  setupStatefulComponent(instance)
}

const normalizeObjectSlots = function(children, slots) { // 新增
  for(let key in children) { // 新增
    const value = children[key] // 新增
    // slots[key] = props => normalizeSlotValue(value(props)) // 新增
    slots[key] = props => value(props)
  } // 新增
}

const normalizeSlotValue = function(value) {  // 新增
  return Array.isArray(value) ? value : [value] // 新增
} // 新增


const publicPropertiesMap = {
  $el: i => i.vnode.el,
  $slots: i => i.slots, // 新增
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

const setupStatefulComponent = function (instance) {
  const component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  const { setup } = component

  if (setup) {
    const setupResult = setup(instance.props, { 
      emit: instance.emit
    });
    handleSetupResult(instance, setupResult)
  }
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
