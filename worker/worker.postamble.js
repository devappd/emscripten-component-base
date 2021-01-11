////////////////////////////////////////////////////////////////////////
// POSTAMBLE TO EMSCRIPTEN WORKER SCRIPT
//
// We append this to the end of the user's worker script then encode the
// combined script as a data URI to be passed to Worker().
////////////////////////////////////////////////////////////////////////

specialHTMLTargets['#window'] = window;
specialHTMLTargets['#document'] = document;
specialHTMLTargets['#screen'] = screen;

JSEvents.registerOrRemoveHandler = function (predefinedFunction) {
  return function(eventHandler) {
    // These functions mutate eventHandler before passing it to JSEvents.registerOrRemoveHandler.
    // They return `true` when the patch function encounters its corresponding event type..
    //patchKeyEventHandler(eventHandler)
    //  || 
    patchResizeEventHandler(eventHandler)
    //  || patchFullscreenchangedEventHandler(eventHandler);

    predefinedFunction(eventHandler);
  }
}(JSEvents.registerOrRemoveHandler);

function patchResizeEventHandler(eventHandler) {
  if (eventHandler.target !== window
    || eventHandler.eventTypeString !== 'resize')
  return false;

  eventHandler.handlerFunc = function(predefinedHandlerFunc) {
    return function(evt) {
      if (evt.target)
        evt.target = findEventTarget(evt.target.nodeName);
      predefinedHandlerFunc(evt);
    }
  }(eventHandler.handlerFunc);
}
