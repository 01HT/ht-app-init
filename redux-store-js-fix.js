// HACK for redux store.js (keanulee): The Redux package assumes 'process' exists - mock it here before
// the module is loaded.
window.process = {
  env: {
    NODE_ENV: "production"
  }
};
