import { default as Manager } from './manager.js';
import { initializeProxy } from './worker/proxyClient.js';

// Imported as a string. Rollup/Webpack are responsible for flagging
// these files as string imports.
import workerPreamble from './worker/worker.preamble.js';
import workerPostamble from './worker/worker.postamble.js';

export default class WorkerManager extends Manager {
  constructor(
    workerScript,
    componentElement, canvasElement, consoleElement,
    userOptions
  ) {
    super(
      componentElement, canvasElement, consoleElement,
      userOptions
    );

    this._workerScript = workerScript;
  }

////////////////////////////////////////////////////////////////////////
// PUBLIC PROPERTIES
////////////////////////////////////////////////////////////////////////

  static async initialize(
    workerScript,
    componentElement, canvasElement, consoleElement,
    userOptions
  ) {
    const manager = new WorkerManager(
      workerScript,
      componentElement, canvasElement, consoleElement,
      userOptions
    );

    await manager._initializeModule();

    return manager;
  }

  async callMain(args) {
    await this._proxyInstance.callMain(args);
  }

  async abort(what = 'Aborted by JS component.') {
    try {
      await this._proxyInstance.abort(what);
    } catch(e) {
      // This API assumes intentional aborting, so fail silently.
    }
  }

  async pauseMainLoop() {
    await this._proxyInstance.pauseMainLoop();
  }

  async resumeMainLoop() {
    await this._proxyInstance.resumeMainLoop();
  }

  async requestFullscreen() {
    return await this.__canvasElement.requestFullscreen();
  }

  async exitFullscreen() {
    return await this.__canvasElement.exitFullscreen();
  }

  onResizeCanvas(...args) {
    if (this.__options.resizeCanvasOnElementSizing) {
      this._handleResizeCanvas(...args);
    }
  }

////////////////////////////////////////////////////////////////////////
// INITIALIZATION MEHTODS
////////////////////////////////////////////////////////////////////////

  async _initializeModule() {
    this._patchWorkerScript();

    const workerDataUri = 'data:text/javascript;base64,' + btoa(this._workerScript);

    const initialModule = {
      // canvas is set by initializeProxy()
      print: this.__getPrintHandler(),
      printErr: this.__getPrintErrHandler()
    };

    this._proxyInstance = await initializeProxy(
      workerDataUri, initialModule,
      this.__componentElement, this.__canvasElement, this.__consoleElement,
      this.__options
    );
  }

  _patchWorkerScript() {
    this._workerScript = 
      workerPreamble
        .replace('{{{ REAL_SCRIPT_DIR }}}', this._getScriptDirectory())
        .replace('{{{ WASM_PATH }}}', this.__options.wasmPath ? this.__options.wasmPath : '')
         + this._workerScript
         + workerPostamble;
    ;
  }

  _getScriptDirectory() {
    // From Emscripten's MODULARIZE
    let scriptDirectory;
    if (typeof document !== "undefined" && document.currentScript)
      scriptDirectory = document.currentScript.src;
    if (scriptDirectory.indexOf("blob:") !== 0)
      scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf("/") + 1);
    else
      scriptDirectory = ""
    return scriptDirectory;
  }

////////////////////////////////////////////////////////////////////////
// CANVAS RESIZE EVENTS
////////////////////////////////////////////////////////////////////////

  _handleResizeCanvas(resizeEntry) {
    // This is half of the patch to Emscripten's window.onresize handler.
    // This is called by a ResizeObserve that is attached to our canvas.
    // We use this to respond to our canvas's element resize specifically,
    // rather than the entire window.

    const event = new FocusEvent('resize', {
      'relatedTarget': resizeEntry.target
    });
    window.dispatchEvent(event);
  }
}