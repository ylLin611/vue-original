import "./style.css";

const obj = {
  foo: true,
};

// 存放 target => key => effect
const bucket = new WeakMap();

let activeEffect;
const effectStack = [];
const effect = (fn, options = {}) => {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn;
    // 把当前effect压入栈中
    effectStack.push(effectFn);
    // 执行effect
    fn();
    // 执行完effect之后，把当前effect从栈中弹出
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
  };
  effectFn.deps = [];
  // 将options挂载到effectFn上
  effectFn.options = options;
  effectFn();
};

const cleanup = (effectFn) => {
  for (let i = 0; i < effectFn.deps.length; i++) {
    effectFn.deps[i].delete(effectFn);
  }
  effectFn.deps.length = 0;
};

const track = (target, key) => {
  if (!activeEffect) return;
  let depsMap = bucket.get(target);
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
};

const trigger = (target, key) => {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  const effects = new Set();
  // 新增判断，只有副作用函数与当前正在执行的不同时，才执行
  deps &&
    deps.forEach((fn) => {
      if (fn !== activeEffect) {
        effects.add(fn);
      }
    });
  effects.forEach((fn) => {
    // trigger时判断若存在scheduler，则执行scheduler
    if (fn.options.scheduler) {
      fn.options.scheduler(fn);
    } else {
      fn();
    }
  });
};

const proxy = new Proxy(obj, {
  get(target, key) {
    // get的时候做track，也就是把effect func添加到桶里
    track(target, key);
    return Reflect.get(target, key);
  },
  set(target, key, value) {
    Reflect.set(target, key, value);
    // set的时候做trigger,也就是执行 effect func
    trigger(target, key);
    return true;
  },
});

effect(() => {
  proxy.foo = proxy.foo + "test";
  console.log(proxy.foo);
});
