let activeEffect

const effectStack = []
const bucket = new WeakMap()
const INTERATE_KEY = Symbol()
const triggerType = {
  SET: 'SET',
  ADD: 'ADD',
  DELETE: "DELETE"
}

function createReactive(obj, isShallow = false, isReadOnly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      // 访问raw时，返回原对象
      if (key === 'raw') return target

      //只有在非只读的时候才需要建立响应联系
      if(!isReadOnly) {
        track(target, key)
      }
      
      const res = Reflect.get(target, key, receiver)
      // 如果是浅响应，直接返回值
      if (isShallow) {
        return res
      }
      // 判断res是否为对象并且不为null，循环调用creative
      if (typeof res === 'object' && res !== null) {
        // 如果数据为只读，则调用readOnly对值进行包装
        return isReadOnly ? readOnly(res) : creative(res)
      }
      return res
    },

    // 没有变化时，不触发响应
    set(target, key, newValue, receiver) {

      if(isReadOnly) {
        console.log(`属性${key}是只读的`)
        return false
      }

      const oldVal = target[key]

      // 如果目标对象是数组，检测被设置的索引值是否小于数组长度
      const type = Array.isArray(target) ? (Number(key) > target.length ? triggerType.ADD : triggerType.SET) : Object.prototype.hasOwnProperty.call(target, key) ? triggerType.SET : triggerType.ADD
      const res = Reflect.set(target, key, newValue, receiver)

      if (target === receiver.raw) {
        if (oldVal !== newValue && (oldVal === oldVal || newValue === newValue)) {
          // 将新的值进行传递，及触发响应的新值
          trigger(target, key, type, newValue)
        }
      }

      return res
    },
    // in操作符
    has(target, key) {
      track(target, key)
      return Reflect.has(target, key)
    },
    // for in
    ownKeys(target) {
      track(target, INTERATE_KEY)
      return Reflect.ownKeys(target)
    },
    // delete
    deleteProperty(target, key) {
      // 是否为只读属性，如果是则打印警告信息并直接返回
      if(isReadOnly) {
        console.log(`属性${key}是只读的`)
        return false
      }
      const hadKey = Object.prototype.hasOwnProperty.call(target, key)
      const res = Reflect.deleteProperty(target, key)

      if (res && hadKey) {
        trigger(target, key, triggerType.DELETE)
      }
    }
  })
}

function track(target, key) {
  if (!target) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }

  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }

  deps.add(activeEffect)
  activeEffect.deps.push(deps)
}

function trigger(target, key, type, newValue) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  let effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
    if (effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })

  // 如果操作目标是数组，并且修改了数组的length属性
  if(Array.isArray(target) && key === 'length') {
    // 对于索引值大于或等于新的length元素
    // 需要把所有相关联的副作用函数取出并添加到effectToRun中待执行
    depsMap.forEach((effects, key)=>{
      // key 与 newValue均为数组下标，因为数组中key为index
      if(key >= newValue) {
        effects.forEach(effectFn=>{
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }

  // 当操作类型是ADD并且目标对象时数组时，应该取出执行那些与 length 属性相关的副作用函数
  if(Array.isArray(target) && type === triggerType.ADD) {
    // 取出与length相关的副作用函数
    const lengthEffects = depsMap.get('length')

    lengthEffects && lengthEffects.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

  if (type === triggerType.ADD || type === triggerType.DELETE) {
    const iterateEffects = depsMap.get(INTERATE_KEY)
    iterateEffects && iterateEffects.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

  effectsToRun.forEach(effect => {
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effect)
    } else {
      effect()
    }
  })

}

function effect(fn, options = {}) {

  let effectFn = function () {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    let res = fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]

    return res
  }
  effectFn.options = options

  effectFn.deps = []
  if (!options.lazy) {
    effectFn()
  }

  return effectFn
}

function cleanup(effectFn) {

  for (let i = 0; i < effectFn.deps.length; i++) {
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
      if (!dirty) {
        dirty = true
        trigger(obj, 'value')
      }

    }
  })

  let obj = {
    get value() {
      if (dirty) {
        value = effectFn()
        dirty = false
      }

      track(obj, 'value')
      return value
    }
  }

  return obj
}


function watch(source, cb) {
  let getter
  if (typeof source === 'function') {
    getter = source
  } else {
    getter = () => traverse(source)
  }

  let newVal, oldVal;
  const effectFn = effect(() => {
    getter()
  }, {
    lazy: true,
    scheduler() {
      newVal = effectFn
      cb(newVal, oldVal)
      oldVal = newVal
    }
  })

  oldVal = effectFn()


  function traverse(value, seen = new Set()) {
    if (typeof value !== 'object' || value == null || seen.has(value)) return
    seen.add(value)

    for (let k in value) {
      traverse(value[k], seen)
    }

    return value
  }
}

// 深响应
function reactive(obj) {
  return createReactive(obj)
}

// 浅响应
function shallowReactive(obj) {
  return createReactive(obj, true)
}


// 浅只读
function shallowReadOnly(obj) {
  return createReactive(obj, true, true)
}

// 深只读
function readOnly(obj) {
  return createReactive(obj, false, true)
}
