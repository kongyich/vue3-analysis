const createComponentInstance = function (vnode) {
  const component = {
    vnode,
    type: vnode.type,
    setupState: {}
  }

  return component
}

const setupComponent = function (instance) {
  setupStatefulComponent(instance)
}

const publicPropertiesMap = {
  $el: i => i.vnode.el
}

const PublicInstanceProxyHandlers = {
  get({ _: instance }, key) {
    const { setupState } = instance

    if (key in setupState) {
      return setupState[key]
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
    const setupResult = setup();
    handleSetupResult(instance, setupResult)
  }
}

const handleSetupResult = function (instance, setupResult) {
  if (typeof setupResult === 'object') {
    instance.setupState = setupResult
  }

  instance.render = instance.type.render;
}
