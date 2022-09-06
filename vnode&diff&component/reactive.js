// 定义仓库
let store = new WeakMap()
// 定义当前处理的依赖函数
let activeEffect

function effect(fn) {
  // 将操作包装为一个函数
  const effectFn = ()=> {
    activeEffect = effectFn
    fn()
  }
  effectFn()
}

function reactive(obj) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      // 收集依赖
      track(target, key)
      return Reflect.get(target, key, receiver)

    },
    set(target, key, newVal, receiver) {
      // 触发依赖
      Reflect.set(target, key, newVal, receiver)
      trigger(target, key)
      
    }
  })
}

function track(target, key) {
  // 如果没有依赖函数，则不需要进行收集。直接return
  if (!activeEffect) return

  // 获取target，也就是对象名
  let depsMap = store.get(target)
  if (!depsMap) {
    store.set(target, (depsMap = new Map()))
  }
  // 获取对象中的key值
  let deps = depsMap.get(key)

  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  // 收集依赖函数
  deps.add(activeEffect)
}

function trigger(target, key) {
  // 取出对象对应的Map
  let depsMap = store.get(target)
  if (!depsMap) return
  // 取出key所对应的Set
  const effects = depsMap.get(key)
  // 执行依赖函数
  // 为避免污染，创建一个新的Set来进行执行依赖函数
  let effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
      effectsToRun.add(effectFn)
  })

  effectsToRun.forEach(effect => effect())
}


const isRef = function(ref) {
  return !!ref.__is_ref
}


const unRef = function(ref) {
  // 看看是不是ref ref -> ref.value   ref === value => ref
  return isRef(ref) ? ref.value : ref
}


const proxyRef = function(proxyWithRef) {
  return new Proxy(proxyWithRef, {
    get(target, key) {
      return unRef(Reflect.get(target, key))
    },
    set(target, key, value) {
      if(isRef(target[key]) && !isRef(value)) {
        return (target[key].value = value)
      } else {
        return Reflect.set(target, key, value)
      }
    }
  })
}
