////////////////////////////////////////////////////////////////////////
// PREAMBLE TO EMSCRIPTEN WORKER SCRIPT
//
// We concatenate this to the user's worker script then encode the
// combined script as a data URI to be passed to Worker().
////////////////////////////////////////////////////////////////////////

var realScriptDirectory = '{{{ REAL_SCRIPT_DIR }}}';
var wasmPath = '{{{ WASM_PATH }}}';

var Module = Module || {};

Object.assign(Module, {
  noInitialRun: true,

  locateFile: function(path) {
    function isAbsoluteUrl(url) {
      try {
        new URL(url);
        return true;
      } catch (e) {
        // URL() throws an exception when passed a relative path and
        // no second argument (`base`)
        return false;
      }
    }

    if (!wasmPath)
      return realScriptDirectory + path;
    
    if (!isAbsoluteUrl(wasmPath))
      return realScriptDirectory + wasmPath;
    else
      return wasmPath;
  },

  postRun: function() {
    postMessage({
      target: 'custom',
      command: 'postRun'
    });
  },

  onCustomMessage: function(message) {
    const userData = message.data.userData;
    const command = userData.command;

    switch(command) {
      case 'callMain': {
        const args = userData.args;
        callMain(args);

        postMessage({
          target: 'custom',
          command: 'calledMain'
        });

        break;
      }

      case 'abort': {
        const reason = userData.reason;
        abort(reason);

        postMessage({
          target: 'custom',
          command: 'aborted'
        });

        break;
      }

      case 'pauseMainLoop': {
        this.pauseMainLoop();

        postMessage({
          target: 'custom',
          command: 'pausedMainLoop'
        });

        break;
      }

      case 'resumeMainLoop': {
        this.resumeMainLoop();

        postMessage({
          target: 'custom',
          command: 'resumedMainLoop'
        });

        break;
      }

      default:
        throw 'huh? ' + command;
    }
  }
});
