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

  effectsToRun.forEach(effect => effect())

}
