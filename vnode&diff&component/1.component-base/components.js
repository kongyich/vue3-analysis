const createComponentInstance = function(vnode) {
  const component = {
    vnode,
    type: vnode.type
  }

  return component
}

const setupComponent = function(instance) {
  setupStatefulComponent(instance)
}

const setupStatefulComponent = function(instance) {
  const component = instance.type
  const { setup } = component

  if(setup) {
    const setupResult = setup();
    handleSetupResult(instance, setupResult)
  }
}

const handleSetupResult = function(instance, setupResult) {
  if(typeof setupResult === 'object') {
    instance.setupState = setupResult
  }

  instance.render = instance.type.render;
}
