let activeEffect

const effectStack = []
const bucket = new WeakMap()
const INTERATE_KEY = Symbol()
const triggerType = {
  SET: 'SET',
  ADD: 'ADD',
  DELETE: "DELETE"
}

const arrayInstrumentations = {}
let shouldTrack = true

;['includes', 'indexOf', 'lastIndexOf'].forEach(method => {
  let originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function(...args) {
    let res = originMethod.apply(this, args)

    if(res === false) {
      res = originMethod.apply(this.raw, args)
    }
    return res
  }
})

;['push', 'pop', 'shift', 'unshift', 'splice'].forEach(method => {
  const originMethod = Array.prototype[method]
  arrayInstrumentations[method] = function(...args) {
    shouldTrack = false
    let res = originMethod.apply(this, args)
    shouldTrack = true

    return res
  }
})


const reactiveMap = new Map()

const mutableInstrumentations = {
  add(key) {
    // 获取原始值，this仍然指向代理对象，通过raw属性获取原始数据对象
    const target = this.raw
    let res

    // 当值不存在时，才需要触发响应
    const hadKey = target.has(key)
    if(!hadKey) {
      // 使用原始之执行add方法时，不需要.bind进行绑定this值了
      res = target.add(key)
      // 通过trigger函数触发响应，并指定操作类型为ADD
      trigger(target, key, 'ADD')
    }
    
    return res
  },

  delete(key) {
    // 获取原始值，this仍然指向代理对象，通过raw属性获取原始数据对象
    const target = this.raw
    const res = target.delete(key)

    // 当值存在时，才需要触发响应
    const hadKey = target.has(key)
    if(hadKey) {
      trigger(target, key, 'DELETE')
    }
    
    return res
  },

  // Map中的get
  get(key) {
    // 获取原始数据
    const target = this.raw
    // 判断key是否存在
    const had = target.has(key)
    // 追踪依赖，建立响应联系
    track(target, key)

    if(had) {
      const res = target.get(key)
      // 如果是对象，那么继续进行转换
      return typeof res === 'object' ? reactive(res) : res
    }
  },
  // Map中的set
  set(key, value) {
      const target = this.raw
      const had = target.has(key)
      // 获取旧值
      const oldVal = target.get(key)
      // 获取原始数据，由于可能value本身已经是原始数据，所以此时value.raw不存在，则直接使用value
      const rawValue = value.raw || value
      target.set(key, rawValue)

      if(!had) {
        // 新增操作
        trigger(target, key, 'ADD')
      } else if(value !== oldVal || (oldVal === oldVal && value === value)) {
        // 修改操作
        trigger(target, key, 'SET')
      }
  },

  // Map中的forEach
  forEach(callback, thisArg) {
    const wrap = val => typeof val === 'object' ? reactive(val) : val
    const target = this.raw
    // 任何会修改Map对象键值对的操作都应该触发副作用函数
    track(target, INTERATE_KEY)

    target.forEach((v, k) => {
      // 通过.call调用callback
      callback.call(thisArg, wrap(v), wrap(k), this)
    })
    // target.forEach(callback)
  },

  // 共用iterationMethod方法
  [Symbol.iterator]: iterationMethod,
  entries: iterationMethod,
  values: valuesIterationMethod,
}

function keyIterationMethod() {
  const target = this.raw
  const itr = target.keys()

  const wrap = v => typeof v === 'object' ? reactive(v) : v

  // key与values和entries不一样，key不需要触发值的更新只关心键的更新
  track(target, MAP_KEYS_INTERATE_KEY)

  return {
    next() {
      const { value, done } = itr.next()
      return {
        value: wrap(value),
        done
      }
    }
  }
}

function valuesIterationMethod() {
  const target = this.raw
  // 通过target.values获取原始的迭代器方法
  const itr = target.values()

  const wrap = v => typeof v === 'object' ? reactive(v) : v
  track(target, INTERATE_KEY)

  return {
    next() {
      const { value, done } = itr.next()
      return {
        value: wrap(value),
        done
      }
    }
  }
}

// 抽离函数，便于复用
function iterationMethod() {
  const target = this.raw
  const itr = target[Symbol.iterator]()

  const wrap = val => typeof val === 'object' ? reactive(val) : val
  // 调用track函数建立响应
  track(target, INTERATE_KEY)

  return {
    next() {
      // 调用原始的迭代器进行获取value和done
      const {value, done} = itr.next()
       return {
        // 不是undefined，则进行包裹
        value: value ? [wrap(value[0]), wrap(value[1])] : value,
        done
      }
    },

    // 可迭代协议
    [Symbol.iterator]() {
      return this
    }
  }
}

function createReactive(obj, isShallow = false, isReadOnly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {

      if(key === 'size') {
        track(target, INTERATE_KEY)
        return Reflect.get(target, key, target)
      }

      return mutableInstrumentations[key]
      // return target[key].bind(target)
      // if (key === 'raw') return target
      // if(Array.isArray(target) && arrayInstrumentations.hasOwnProperty(key)) {
      //   return Reflect.get(arrayInstrumentations, key, receiver)
      // }

      // if(!isReadOnly && typeof key !== 'symbol') {
      //   track(target, key)
      // }
      
      // const res = Reflect.get(target, key, receiver)
      // if (isShallow) {
      //   return res
      // }
      // if (typeof res === 'object' && res !== null) {
      //   return isReadOnly ? readOnly(res) : creative(res)
      // }
      // return res
    },

    set(target, key, newValue, receiver) {

      if(isReadOnly) {
        console.log(`属性${key}是只读的`)
        return false
      }

      const oldVal = target[key]

      const type = Array.isArray(target) ? (Number(key) > target.length ? triggerType.ADD : triggerType.SET) : Object.prototype.hasOwnProperty.call(target, key) ? triggerType.SET : triggerType.ADD
      const res = Reflect.set(target, key, newValue, receiver)

      if (target === receiver.raw) {
        if (oldVal !== newValue && (oldVal === oldVal || newValue === newValue)) {
          trigger(target, key, type, newValue)
        }
      }

      return res
    },
    has(target, key) {
      track(target, key)
      return Reflect.has(target, key)
    },
    ownKeys(target) {
      track(target, Array.isArray(target) ? 'length' : INTERATE_KEY)
      return Reflect.ownKeys(target)
    },
    deleteProperty(target, key) {
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
  if (!activeEffect || !shouldTrack) return
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

  if(Array.isArray(target) && key === 'length') {
    depsMap.forEach((effects, key)=>{
      if(key >= newValue) {
        effects.forEach(effectFn=>{
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn)
          }
        })
      }
    })
  }

  if(Array.isArray(target) && type === triggerType.ADD) {
    const lengthEffects = depsMap.get('length')

    lengthEffects && lengthEffects.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }
  // 如果是map类型的set操作，也应该触发响应
  if (type === triggerType.ADD || type === triggerType.DELETE || (type === triggerType.SET && Object.prototype.toString.call(target) === '[object Map]')) {
    const iterateEffects = depsMap.get(INTERATE_KEY)
    iterateEffects && iterateEffects.forEach(effectFn => {
      if (effectFn !== activeEffect) {
        effectsToRun.add(effectFn)
      }
    })
  }

  // 处理Map中的keys的操作，只需更新key
  if((type === 'ADD' || type === 'DELETE' && Object.prototype.toString.call(target) === '[object Map]')) {
    const iterateEffects = depsMap.get(MAP_KEYS_INTERATE_KEY)
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
  const existionProxy = reactiveMap.get(obj)
  if(existionProxy) return existionProxy
  const proxy = createReactive(obj)
  reactiveMap.set(obj, proxy)
  return proxy
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


function ref(val) {
  const wrapper = {
    value: val
  }
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })
  return reactive(wrapper)
}


function toRef(obj) {
  let res = {}

  for(let key in obj) {
    res[key] = toRef(obj, key)
  }
  return res
}

function toRef(obj, key) {
  const wrapper = {
    get value() {
      return obj[key]
    },
    set value(val) {
      obj[key] = val
    }
  }
  Object.defineProperty(wrapper, '__v_isRef', {
    value: true
  })
  return wrapper
}


function proxyRef(target) {
  return new Proxy(target, {
    get(target, key) {
      let value = Reflect.get(target, key, receiver)
      // 如果读取的值是ref，则返回他的value属性值
      return value.__v_isRef ? value.value : value
    },
    set(target, key, newVal) {
      // 通过target读取其值
      let oldVal = target[key]
      // 如果是ref，则通过设置其对应的value属性值
      if(oldVal.__v_isRef) {
        value.value = newVal
        return true
      }
      return Reflect.set(target, key, newVal, receiver)
    }
  })
}
