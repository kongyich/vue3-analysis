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
  // [[fn]]
  activeEffect.deps.push(deps) // 新增
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) return
  const effects = depsMap.get(key)

  // 因为删除又添加都在同一个deps中，所以会产生无限执行
  let effectsToRun = new Set(effects)
  effectsToRun.forEach(effect => effect())

  // effects && effects.forEach(effect => effect())
}

function effect(fn) {

  let effectFn = function() {
    // 在执行读取收集操作前先清空
    cleanup(effectFn)
    activeEffect = effectFn
    fn()
  }

  effectFn.deps = []
  effectFn()


  // // 执行effect时，将函数设置为当前的响应函数
  // activeEffect = fn
  // // 执行一次函数
  // fn()
}

// 清除函数，清除effectFn函数下的deps属性
// 里面保存着所有依赖的deps
function cleanup(effectFn) {

  for(let i = 0; i < effectFn.deps.length; i++) {
    // [effectFn, effectFn]
    const dep = effectFn.deps[i]
    dep.delete(effectFn)
  }

  effectFn.deps.length = 0

}
