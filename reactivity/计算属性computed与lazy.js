// 当前的响应函数
let activeEffect
// 增加effect调用栈
const effectStack = []

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
  activeEffect.deps.push(deps)
}

function trigger(target, key) {
  const depsMap = bucket.get(target)
  if(!depsMap) return
  const effects = depsMap.get(key)

  // 因为删除又添加都在同一个deps中，所以会产生无限执行
  let effectsToRun = new Set()

  effects && effects.forEach(effectFn => {
    // 如果trigger出发执行的副作用函数与当前正在执行的副作用函数相同，则不触发执行
    if(effectFn !== activeEffect) {
      effectsToRun.add(effectFn)
    }
  })

  effectsToRun.forEach(effect => {
    // 如果副作用函数中存在调度器，则调用调度器，并将副作用函数作为参数传递
    if(effectFn.options.scheduler) {
      effectFn.options.scheduler(effect)
    } else {
      effect()
    }
  })

}

function effect(fn, options = {}) {

  let effectFn = function() {
    // 在执行读取收集操作前先清空
    cleanup(effectFn)
    activeEffect = effectFn
    // 入栈
    effectStack.push(effectFn)
    // 将执行结果进行缓存
    let res = fn() // 新增
    // 收集完毕后弹出
    effectStack.pop()
    // 始终指向栈顶
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


function computed(getter) {
  // 将值进行缓存
  let value
  let dirty = true
  let effectFn = effect(getter, {
    lazy: true,
    // 添加调度器，值发生变化的时候再次执行
    scheduler() {
      if(!dirty) {
        dirty = true
        // 当值发生改变时，手动调用trigger函数触发响应
        trigger(obj, 'value')
      }
     
    }
  })

  // 读取值的时候才执行effectFn

  let obj = {
    get value() {
      // 控制是否执行
      if(dirty) {
        value = effectFn()
        dirty = false
      }

      // 当读取value时，手动调用track函数进行追踪
      track(obj, 'value')
      return value
    }
  }

  return obj
}
