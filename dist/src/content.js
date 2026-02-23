const i="meetflow-sidebar-root",d="380px";let t=null,o=!0;function r(){if(document.getElementById(i))return;document.querySelector('[data-call-ended="false"]')??document.querySelector("[jscontroller]")??document.body;const e=document.createElement("div");e.id=i,Object.assign(e.style,{position:"fixed",top:"0",right:"0",width:d,height:"100vh",zIndex:"9999",display:"flex",flexDirection:"column",pointerEvents:"none",transition:"transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)"}),t=document.createElement("iframe"),t.src=chrome.runtime.getURL("sidebar.html"),Object.assign(t.style,{width:"100%",height:"100%",border:"none",borderRadius:"0",pointerEvents:"all",background:"transparent"}),t.allow="microphone; display-capture",e.appendChild(t),document.body.appendChild(e),c()}function c(){const e=document.createElement("style");e.id="meetflow-layout",e.textContent=`
    /* Shrink Meet's main area to make room for the sidebar */
    [data-allocation-index="0"],
    [jsmodel*="VfPpkd"],
    .crqnQb,
    .r6xAKc {
      transition: padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    body.meetflow-active [data-allocation-index="0"] {
      padding-right: ${d} !important;
    }
  `,document.head.appendChild(e),document.body.classList.add("meetflow-active")}function s(){const e=document.getElementById(i);e&&(o=!o,e.style.transform=o?"translateX(0)":`translateX(${d})`,o?document.body.classList.add("meetflow-active"):document.body.classList.remove("meetflow-active"))}function a(){new MutationObserver(()=>{const n=window.location.pathname.replace("/","");(!!document.querySelector("[data-call-ended='false']")||!!document.querySelector(".crqnQb"))&&!document.getElementById(i)&&(r(),chrome.runtime.sendMessage({type:"MEETING_STARTED",meetingId:n}))}).observe(document.body,{childList:!0,subtree:!0})}chrome.runtime.onMessage.addListener(e=>{e.type==="TOGGLE_SIDEBAR"&&s()});document.addEventListener("keydown",e=>{var n;(e.metaKey||e.ctrlKey)&&e.key==="k"&&(e.preventDefault(),(n=t==null?void 0:t.contentWindow)==null||n.postMessage({type:"OPEN_MAGIC_SEARCH"},"*"))});document.readyState==="loading"?document.addEventListener("DOMContentLoaded",a):a();
