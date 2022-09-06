const createComponentInstance = function (vnode) {
  const component = {
    vnode,
    type: vnode.type,
    props: {},
    setupState: {}
  }

  return component
}

const setupComponent = function (instance) {

  instance.props = instance.vnode.props
  setupStatefulComponent(instance)
}

const publicPropertiesMap = {
  $el: i => i.vnode.el
}

const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState, props } = instance

    // if (key in setupState) {
    //   return setupState[key]
    // }
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
    // const setupResult = setup();
    const setupResult = setup(instance.props);
    handleSetupResult(instance, setupResult)
  }
}

const handleSetupResult = function (instance, setupResult) {
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult
  }

  instance.render = instance.type.render;
}
