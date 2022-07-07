
let activeEffect

const effectStack = []
const bucket = new WeakMap()

function reactive(obj) {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, value) {
      trigger(target, key)
      target[key] = value
    }
  })
}

function track(target, key) {
  if(!target) return
  let depsMap = bucket.get(target)
  if(!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if(!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  deps.add(activeEffect)
  // [[fn]]
  activeEffect.deps.push(deps)
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) return
  const effects = depsMap.get(key)

  let effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
    if(effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })

  effectsToRun.forEach(effect => {
    if(effectFn.options.scheduler) {
      effectFn.options.scheduler(effect)
    } else {
      effect()
    }
  })

}

function effect(fn, options = {}) {

  let effectFn = function() {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    let res = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1] 
 
    return res // 新增
  }
  effectFn.options = options

  effectFn.deps = []
  if(!options.lazy) {
    effectFn()
  }
  
  return  effectFn
}

function cleanup(effectFn) {

  for(let i = 0; i < effectFn.deps.length; i++) {
    // [effectFn, effectFn]
    const dep = effectFn.deps[i]
    dep.delete(effectFn)
  }

  effectFn.deps.length = 0

}


function computed(getter) {
  let value
  let dirty = true
  let effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if(!dirty) {
        dirty = true
        trigger(obj, 'value')
      }
     
    }
  })

  let obj = {
    get value() {
      if(dirty) {
        value = effectFn()
        dirty = false
      }

      track(obj, 'value')
      return value
    }
  }

  return obj
}


function watch(source, cb, options = {}) {
  let getter
  if(typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let newVal, oldVal;
  const effectFn = effect(()=> getter(), 
  {
    lazy: true,
    scheduler: runFn
  })


  function runFn() {
    newVal = effectFn
    // 第一次执行runFn函数，旧值为undefined
    cb(newVal, oldVal)
    oldVal = newVal
  }

  if(options.immediate) {
    // 如果设置了immediate，则代表需要先执行一次
    runFn()
  } else {
    // 手动更新副作用函数，拿到的就是旧值
    oldVal = effectFn()
  }


  function traverse(value, seen = new Set()) {
    if(typeof value !== 'object' || value == null || seen.has(value)) {
      seen.add(value)

      for(let k in value) {
        traverse(value[k], seen)
      }
    }
    return value
  }
}
