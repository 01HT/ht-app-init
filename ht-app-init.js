"use strict";
async function getProjectEnvironment() {
  const host = window.location.host;
  if (window.appConfig.prod.hosts.indexOf(host) !== -1) return "prod";
  if (window.appConfig.dev.hosts.indexOf(host) !== -1) return "dev";
  throw new Error("Wrong host");
}

function addNoindexMeta() {
  const meta = document.createElement("meta");
  meta.setAttribute("name", "robots");
  meta.setAttribute("content", "noindex");
  document.head.appendChild(meta);
}

async function redirectIfDefaultFirebaseDomain() {
  if (
    window.appConfig.firebaseDomains.indexOf(window.location.host) !== -1 &&
    window.location.origin !== window.appConfig.origin
  ) {
    let newHref = window.location.href.replace(
      window.location.origin,
      window.appConfig.origin
    );
    window.location.replace(newHref);
  }
}

async function checkBrowserSupport() {
  const browserSupported =
    "attachShadow" in Element.prototype &&
    customElements &&
    HTMLTemplateElement &&
    document.createElement("script").noModule !== undefined;
  return browserSupported;
}

function addScript(src, async, module) {
  const script = document.createElement("script");
  script.src = src;
  if (async) script.async = true;
  if (module) script.setAttribute("type", "module");
  if (src.includes("/node_modules/firebase/")) {
    script.onload = _ => {
      if (src === "/node_modules/firebase/firebase-app.js") {
        addScript("/node_modules/firebase/firebase-auth.js", true);
        addScript("/node_modules/firebase/firebase-firestore.js", true);
      }
      if (src === "/node_modules/firebase/firebase-auth.js")
        window.firebaseAuthReady = true;
      if (src === "/node_modules/firebase/firebase-firestore.js")
        window.firebaseFirestoreReady = true;
      if (window.firebaseAuthReady && window.firebaseFirestoreReady)
        initFirebaseApp();
    };
  }
  document.body.appendChild(script);
}

function initFirebaseApp() {
  window.firebase.initializeApp(window.appConfig.firebaseConfig);
  let appElement = document.createElement(window.appConfig.shellName);
  document.body.appendChild(appElement);
}

async function initApp() {
  const projectEnv = await getProjectEnvironment();
  if (projectEnv === "dev") addNoindexMeta();
  for (let name in window.appConfig[projectEnv]) {
    window.appConfig[name] = window.appConfig[projectEnv][name];
  }
  delete window.appConfig["dev"];
  delete window.appConfig["prod"];

  await redirectIfDefaultFirebaseDomain();

  const browserSupported = await checkBrowserSupport();

  if (!browserSupported) {
    addScript(
      "/node_modules/@01ht/ht-app-browser-not-supported/set-browser-not-supported-page.js"
    );
    return;
  } else {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function() {
        navigator.serviceWorker.register("/service-worker.js", {
          scope: "/"
        });
      });
    }
    // Add polyfills for crawlers
    addScript(
      "/node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"
    );
    // Add app shell module
    addScript(`/src/components/${window.appConfig.shellName}.js`, true, true);
    window.firebaseAuthReady = false;
    window.firebaseFirestoreReady = false;
    addScript("/node_modules/firebase/firebase-app.js", true);
  }
}

initApp();
