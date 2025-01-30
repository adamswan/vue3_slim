import { EMPTY_OBJ } from '@vue/shared';
import { Text, Comment, Fragment } from './vnode';
import { ShapeFlags } from 'packages/shared/src/shapeFlags';
import { isSameVNodeType } from './vnode';

export interface RendererOptions {
  // 创建元素
  createElement: (type: string) => any;

  // 给标签设置文本
  setElementText: (node: Element, text: string) => void;

  // 处理标签身上的所有属性
  pathProp: (el: Element, key: string, prevValue: any, nextValue: any) => void;

  // 插入元素
  insert: (el: Element, parent: Element, anchor?: Element | null) => void;

  patchProp(el: Element, key: string, prevValue: any, nextValue: any): void;

  // 卸载指定dom
  remove(el): void;

  // 创建 Text 节点
  createText(text: string);

  //设置 text
  setText(node, text): void;

  //设置 text
  createComment(text: string);
}

export function createRenderer(options: RendererOptions) {
  return baseCreateRenderer(options);
}

// 创建渲染器的核心函数
function baseCreateRenderer(options: RendererOptions): any {
  // 从渲染配置对象 options 中解构出需要的函数
  // 需要跨平台渲染，故重命名为host开头
  const {
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove
  } = options;

  console.log('options执行', options);

  const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode === null) {
      console.log('挂载');
      // 挂载
      mountElement(newVNode, container, anchor);
    } else {
      console.log('更新');
      // 更新
      patchElement(oldVNode, newVNode);
    }
  };

  // 用于挂载元素的函数
  const mountElement = (vnode, container, anchor) => {
    const { type, props, shapeFlag } = vnode;

    // 1. 创建元素
    const el = (vnode.el = hostCreateElement(type));

    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 2. 设置文本
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      //
    }

    if (props) {
      // 3. 设置 props
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }

    // 4. 插入
    hostInsert(el, container, anchor);
  };

  // 用于更新元素的函数
  const patchElement = (oldVNode, newVNode) => {
    const el = (newVNode.el = oldVNode.el); // 浅拷贝

    const oldProps = oldVNode.props || EMPTY_OBJ;
    const newProps = newVNode.props || EMPTY_OBJ;

    patchChildren(oldVNode, newVNode, el, null);

    patchProps(el, newVNode, oldProps, newProps);
  };

  // 更新子节点
  const patchChildren = (oldVNode, newVNode, container, anchor) => {
    console.log('patchChildren', oldVNode, newVNode);
    // 旧节点的 children
    const c1 = oldVNode && oldVNode.children;
    // 旧节点的 prevShapeFlag
    const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0;
    // 新节点的 children
    const c2 = newVNode.children;

    // 新节点的 shapeFlag
    const { shapeFlag } = newVNode;

    // 新子节点为 TEXT_CHILDREN
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 旧子节点为 ARRAY_CHILDREN
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // TODO: 卸载旧子节点
      }
      // 新旧子节点不同
      if (c2 !== c1) {
        // 挂载新子节点的文本
        hostSetElementText(container, c2 as string);
      }
    } else {
      // 旧子节点为 ARRAY_CHILDREN
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 新子节点也为 ARRAY_CHILDREN
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 这里要进行 diff 运算
          // patchKeyedChildren(c1, c2, container, anchor);
        }
        // 新子节点不为 ARRAY_CHILDREN，则直接卸载旧子节点
        else {
          // TODO: 卸载
        }
      } else {
        // 旧子节点为 TEXT_CHILDREN
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          // 删除旧的文本
          hostSetElementText(container, '');
        }
        // 新子节点为 ARRAY_CHILDREN
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // TODO: 单独挂载新子节点操作
        }
      }
    }
  };

  // 更新 props
  const patchProps = (el: Element, vnode, oldProps, newProps) => {
    console.log('patchProps执行');
    // 新旧 props 不相同时才进行处理
    if (oldProps !== newProps) {
      // 遍历新的 props，依次触发 hostPatchProp ，赋值新属性
      for (const key in newProps) {
        const next = newProps[key];
        const prev = oldProps[key];
        if (next !== prev) {
          hostPatchProp(el, key, prev, next);
        }
      }
      // 存在旧的 props 时
      if (oldProps !== EMPTY_OBJ) {
        // 遍历旧的 props，依次触发 hostPatchProp ，删除不存在于新props 中的旧属性
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
          }
        }
      }
    }
  };

  // 用于比较新旧 VNode 的 patch 函数
  const patch = (oldVNode, newVNode, container, anchor = null) => {
    if (oldVNode === newVNode) {
      // 如果新旧 VNode 是同一个对象，则直接返回
      return;
    }

    // 如果新旧 VNode 类型不同，则卸载旧 VNode，并挂载新 VNode
    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
      // 如果新旧 VNode 不是同一个对象，且旧 VNode 存在，则卸载旧 VNode
      unmount(oldVNode);
      // 置空旧 VNode , 进而触发新 VNode 的挂载操作
      oldVNode = null;
    }

    const { type, shapeFlag } = newVNode;

    switch (type) {
      case Text:
        // 如果新 VNode 的类型是文本节点，则处理文本节点的更新
        // processText(oldVNode, newVNode, container);
        break;
      case Comment:
        // 如果新 VNode 的类型是注释节点，则处理注释节点的更新
        // processComment(oldVNode, newVNode, container);
        break;

      case Fragment:
        // 如果新 VNode 的类型是片段节点，则处理片段节点的更新
        // processFragment(oldVNode, newVNode, container);
        break;

      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 原生 element
          processElement(oldVNode, newVNode, container, anchor);
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // .vue 组件
        }
    }
  };

  // 用于创建 VNode 树的 render 函数
  const render = (vnode, container) => {
    if (vnode === null) {
      // 如果旧 vnode 为 null，则直接将容器清空
      if (container._vnode) {
        unmount(container._vnode);
      }
    } else {
      // 如果 vnode 不为 null，则调用 patch 方法进行更新
      patch(container._vnode || null, vnode, container);
    }

    // 更新 _vnode ，即将新的 vnode 赋值给容器的 _vnode 属性，作为旧的 vnode，下次渲染时可以进行比较
    container._vnode = vnode;
  };

  // 卸载指定dom
  const unmount = vnode => {
    hostRemove(vnode.el!);
  };

  return {
    render
  };
}
