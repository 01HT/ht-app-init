"use strict";
async function getProjectEnvironment(appConfig, currentHost) {
  if (appConfig.prod.hosts.indexOf(currentHost) !== -1) return "prod";
  if (appConfig.dev.hosts.indexOf(currentHost) !== -1) return "dev";
  throw new Error("Wrong host");
}

function addNoindexMeta() {
  const meta = document.createElement("meta");
  meta.setAttribute("name", "robots");
  meta.setAttribute("content", "noindex");
  document.head.appendChild(meta);
}

async function redirectIfDefaultFirebaseDomain(appConfig, currentHost) {
  if (
    appConfig.firebaseDomains.indexOf(currentHost) !== -1 &&
    currentHost !== appConfig.domain
  ) {
    let newHref = window.location.href.replace(currentHost, appConfig.domain);
    window.location.replace(newHref);
  }
}

async function checkBrowserSupport() {
  const browserSupported =
    "attachShadow" in Element.prototype &&
    window.customElements &&
    window.HTMLTemplateElement &&
    document.createElement("script").noModule !== undefined;
  return browserSupported;
}

function addScript(src, async) {
  const script = document.createElement("script");
  script.src = src;
  if (async) script.async = true;
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
  document.body.appendChild(script);
}

function initFirebaseApp() {
  window.firebase.initializeApp(window.appConfig.firebaseConfig);
  let appElement = document.createElement(window.appConfig.shellName);
  document.body.appendChild(appElement);
}

async function initApp(appConfig) {
  const currentHost = window.location.host;
  const projectEnv = await getProjectEnvironment(appConfig, currentHost);
  if (projectEnv === "dev") addNoindexMeta();
  for (let name in window.appConfig[projectEnv]) {
    window.appConfig[name] = window.appConfig[projectEnv][name];
  }
  delete window.appConfig["dev"];
  delete window.appConfig["prod"];
  await redirectIfDefaultFirebaseDomain(window.appConfig, currentHost);

  const browserSupported = await checkBrowserSupport();

  if (!browserSupported) {
    addScript(
      "/node_modules/@01ht/ht-app-browser-not-supported/set-browser-not-supported-page.js"
    );
    return;
  } else {
    // Need for crawlers
    addScript(
      "/node_modules/@webcomponents/webcomponentsjs/webcomponents-loader.js"
    );
    window.firebaseAuthReady = false;
    window.firebaseFirestoreReady = false;
    addScript("/node_modules/firebase/firebase-app.js", true);
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", function() {
      navigator.serviceWorker.register("/service-worker.js", {
        scope: "/"
      });
    });
  }
}

initApp(window.appConfig);
