(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[931],{5894:function(e,t,n){Promise.resolve().then(n.bind(n,5721))},8811:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"default",{enumerable:!0,get:function(){return dynamic}});let r=n(1024);n(2265);let l=r._(n(7075));function convertModule(e){return{default:(null==e?void 0:e.default)||e}}function dynamic(e,t){let n=l.default,r={loading:e=>{let{error:t,isLoading:n,pastDelay:r}=e;return null}};"function"==typeof e&&(r.loader=e),Object.assign(r,t);let o=r.loader;return n({...r,loader:()=>null!=o?o().then(convertModule):Promise.resolve(convertModule(()=>null))})}("function"==typeof t.default||"object"==typeof t.default&&null!==t.default)&&void 0===t.default.__esModule&&(Object.defineProperty(t.default,"__esModule",{value:!0}),Object.assign(t.default,t),e.exports=t.default)},9167:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),function(e,t){for(var n in t)Object.defineProperty(e,n,{enumerable:!0,get:t[n]})}(t,{suspense:function(){return suspense},NoSSR:function(){return NoSSR}});let r=n(1283);function suspense(){let e=Error(r.NEXT_DYNAMIC_NO_SSR_CODE);throw e.digest=r.NEXT_DYNAMIC_NO_SSR_CODE,e}function NoSSR(e){let{children:t}=e;return t}},7075:function(e,t,n){"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"default",{enumerable:!0,get:function(){return _default}});let r=n(1024),l=r._(n(2265)),o=n(9167),_default=function(e){let t=Object.assign({loader:null,loading:null,ssr:!0},e);function LoadableComponent(e){let n=t.loading,r=l.default.createElement(n,{isLoading:!0,pastDelay:!0,error:null}),u=t.ssr?l.default.Fragment:o.NoSSR,a=t.lazy;return l.default.createElement(l.default.Suspense,{fallback:r},l.default.createElement(u,null,l.default.createElement(a,e)))}return t.lazy=l.default.lazy(t.loader),LoadableComponent.displayName="LoadableComponent",LoadableComponent}},5721:function(e,t,n){"use strict";n.r(t),n.d(t,{default:function(){return Page}});var r=n(7437);n(2265);var l=n(8811),o=n.n(l);let u=o()(()=>Promise.all([n.e(98),n.e(704)]).then(n.bind(n,5704)),{loadableGenerated:{webpack:()=>[5704]},ssr:!1,loading:()=>(0,r.jsx)("div",{className:"min-h-screen flex items-center justify-center",children:(0,r.jsx)("p",{children:"Loading..."})})});function Page(){return(0,r.jsx)("main",{className:"min-h-screen p-4",children:(0,r.jsx)(u,{})})}},622:function(e,t,n){"use strict";/**
 * @license React
 * react-jsx-runtime.production.min.js
 *
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */var r=n(2265),l=Symbol.for("react.element"),o=(Symbol.for("react.fragment"),Object.prototype.hasOwnProperty),u=r.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,a={key:!0,ref:!0,__self:!0,__source:!0};function q(e,t,n){var r,f={},s=null,i=null;for(r in void 0!==n&&(s=""+n),void 0!==t.key&&(s=""+t.key),void 0!==t.ref&&(i=t.ref),t)o.call(t,r)&&!a.hasOwnProperty(r)&&(f[r]=t[r]);if(e&&e.defaultProps)for(r in t=e.defaultProps)void 0===f[r]&&(f[r]=t[r]);return{$$typeof:l,type:e,key:s,ref:i,props:f,_owner:u.current}}t.jsx=q,t.jsxs=q},7437:function(e,t,n){"use strict";e.exports=n(622)}},function(e){e.O(0,[971,472,744],function(){return e(e.s=5894)}),_N_E=e.O()}]);