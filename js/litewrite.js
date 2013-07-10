define(function(require) {

  var $ = require('jquery');
  var _ = require('underscore');
  var Backbone = require('backbone');
  var AppView = require('views/app');
  var docs = require('collections/docs');
  var cache = require('utils/cache');
  var settings = require('models/settings');
  var router = require('utils/router');
  var remoteStorageDocuments = require('remotestorage-documents');


  function litewrite() {

    var origHash = document.location.hash;

    remoteStorage.on('ready', fetch);

    remoteStorage.on('disconnect', function() {
      docs.reset().addNew();
    });

    remoteStorage.claimAccess('documents', 'rw');
    remoteStorage.documents.init();
    remoteStorage.displayWidget('remotestorage-connect');

    remoteStorageDocuments.onChange('notes', function(event) {
      if(event.origin !== 'window') {
        fetch();
      }
    });

    setTimeout(function() {
      var md = origHash.match(/access_token=([^&]+)/);
      if(md && (! remoteStorage.getBearerToken())) {
        // backbone stole our access token
        remoteStorage.setBearerToken(md[1]);
      }
    }, 0);

    settings
      .on('change:openDocId', saveDocAndChange)
      .on('change:openDocId', setWindowTitle)
      .on('change:openDocId', router.setUrl, router)
      .on('change:openDocId', docs.deleteEmpty, docs);

    docs
      .on('change:title', router.setUrl, router)
      .on('change:title', setWindowTitle)
      .on('add', updateOpenDocId);


    fetch();

    $.when(settings.loading, docs.loading)
      .done(loadCache);

    cache.loading.done(setWindowTitle, startHistory);

    //Load on DOM-ready
    $(function() {
      new AppView();
      new FastClick(document.body);
    });

  }

  function loadCache() {
    ensureOpenDocId();
    setOpenDoc();
    cache.loading.resolve();
  }

  function ensureOpenDocId() {
    if ( _.isUndefined(settings.get('openDocId')) ) {
      settings.save('openDocId', docs.first().id);
    }
  }

  function saveDocAndChange() {
    if (cache.openDoc) cache.openDoc.save();
    setOpenDoc();
  }

  function setOpenDoc() {
    cache.openDoc = docs.get( settings.get('openDocId') );
  }

  function setWindowTitle() {
    document.title = (
      cache.openDoc ? cache.openDoc.get('title') : null
    ) || 'Litewrite';
  }

  function updateOpenDocId(doc) {
    settings.save('openDocId', doc.id);
  }

  function startHistory() {
    Backbone.history.start();
  }


  fetch = _.debounce(function() {
    docs.fetch({
      success: function() {
        docs.trigger('fetch');
        setOpenDoc();
        if (docs.isEmpty()) docs.addNew();
        docs.loading.resolve();
      }
    });
  }, 300);


  return litewrite;
});
