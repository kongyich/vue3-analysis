const createComponentInstance = function (vnode) {
  const component = {
    vnode,
    type: vnode.type,
    props: {},
    setupState: {},
    emit: () => { } // 增加
  }

  component.emit = emit.bind(null, component) // 增加

  return component
}

const setupComponent = function (instance) {
  instance.props = instance.vnode.props || {}
  setupStatefulComponent(instance)
}

const publicPropertiesMap = {
  $el: i => i.vnode.el
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
      console.log(instance);
      return publicGetter(instance);
    }
  }
}

const setupStatefulComponent = function (instance) {
  const component = instance.type
  instance.proxy = new Proxy({ _: instance }, PublicInstanceProxyHandlers);
  const { setup } = component

  if (setup) {
    const setupResult = setup(instance.props, {  // 修改
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
