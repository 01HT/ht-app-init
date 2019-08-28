"use strict";
async function getProjectEnvironment() {
  const host = location.host;
  if (appConfig.prod.hosts.indexOf(host) !== -1) return "prod";
  if (appConfig.dev.hosts.indexOf(host) !== -1) return "dev";
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
    appConfig.firebaseDomains.indexOf(location.host) !== -1 &&
    location.origin !== appConfig.origin
  ) {
    let newHref = location.href.replace(location.origin, appConfig.origin);
    location.replace(newHref);
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
        firebaseAuthReady = true;
      if (src === "/node_modules/firebase/firebase-firestore.js")
        firebaseFirestoreReady = true;
      if (firebaseAuthReady && firebaseFirestoreReady) initFirebaseApp();
    };
  }
  document.body.appendChild(script);
}

function initFirebaseApp() {
  firebase.initializeApp(appConfig.firebaseConfig);
  let appElement = document.createElement(appConfig.shellName);
  document.body.appendChild(appElement);
}

async function initApp() {
  const projectEnv = await getProjectEnvironment();
  if (projectEnv === "dev") addNoindexMeta();
  for (let name in appConfig[projectEnv]) {
    appConfig[name] = appConfig[projectEnv][name];
  }
  delete appConfig["dev"];
  delete appConfig["prod"];

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
    addScript(`/src/components/${appConfig.shellName}.js`, true, true);
    firebaseAuthReady = false;
    firebaseFirestoreReady = false;
    addScript("/node_modules/firebase/firebase-app.js", true);
  }
}

initApp();
