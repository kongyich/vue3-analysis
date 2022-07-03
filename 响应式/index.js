// 当前的响应函数
let activeEffect;

// 总存储的空间
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
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) return
  const effects = depsMap.get(key)

  effects && effects.forEach(effect => effect())
}

function effect(fn) {
  // 执行effect时，将函数设置为当前的响应函数
  activeEffect = fn
  // 执行一次函数
  fn()
}
