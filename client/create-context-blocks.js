var searchDep = new Tracker.Dependency();

var createBlockHelpers = {
  startingBlock: function() {
    if (this instanceof ContextBlock) {
      return this;
    }
  },
  isFocused: function () {
    var focusResult = Template.instance().focusResult.get();
    if (_.isObject(focusResult)) {
      if (this._id === focusResult._id) {
        return true;
      }
    }
  },
  isActive: function () {
    var focusResult = Template.instance().focusResult.get();
    if (_.isObject(focusResult)) {
      return true;
    }
    return false;
  },
  selected: function() {
    return (this.source === Template.instance().source.get());
  },
  loading: function() {
    if (Template.instance().loadingResults)
      return Template.instance().loadingResults.get()
  },
  results: function () {
    searchDep.depend();
    return SearchResults.find({
      searchQuery: $('input').val(),
      type: Template.instance().type,
      source: Template.instance().source.get()
    });
  }
};


searchScrollFn = function(d, template) {
  var searchContainer = $("ol.search-results-container");

  if ((searchContainer.scrollTop() + searchContainer.height()) === searchContainer[0].scrollHeight && !template.loadingResults.get()) {
    template.search($('input').val());
  }
};

throttledSearchScrollFn = _.throttle(searchScrollFn, 20);


var createBlockEvents = {
  "click .data-source": function(d, template) {
    template.source.set(this.source);
  },

  "submit form": function(d, template) {
    d.preventDefault();
    template.search($('input').val());
  },

  "scroll ol.search-results-container": throttledSearchScrollFn,

  "click li": function(d, template) {
    template.focusResult.set(this);
  },

  "click .add-button": function(d, template) {
    var contextId = ContextBlocks.insert(template.focusResult.get());
    return window.addContextToStory(Session.get("storyId"), contextId, Session.get("currentY"));
  },
  "click .cancel": function() {
    Session.set('addingContext', false);
    return Session.set('editingContext', null);
  }
};


Template.create_video_section.helpers(createBlockHelpers);
Template.create_video_section.events(createBlockEvents);

Template.create_image_section.helpers(createBlockHelpers);
Template.create_image_section.events(createBlockEvents);

Template.create_map_section.helpers(createBlockHelpers);
Template.create_map_section.events(createBlockEvents);

Template.create_text_section.helpers(createBlockHelpers);
Template.create_text_section.events(createBlockEvents);


Template.create_video_section.created = function() {
  this.focusResult = new ReactiveVar();
  this.loadingResults = new ReactiveVar();
  this.type = 'video';
  this.source = new ReactiveVar('youtube');
  this.nextPageToken = null;

  var that = this;

  this.search = function(query) {
    searchParams = {
      q: query
    };

    pageToken = that.nextPageToken;
    if (pageToken) {
      searchParams['pageToken'] = pageToken;
    };

    that.loadingResults.set(true);
    searchDep.changed();


    Meteor.call('youtubeVideoSearchList', searchParams, function(err, results) {
      var previousPageToken = that.nextPageToken;
      var nextPageToken = results['nextPageToken'];

      items = results['items'];

      that.nextPageToken = nextPageToken;
      if (err) {
        console.log(err);
        return;
      }
      if (!items) {
        return;
      }
      _.chain(items)
        .map(function(element) {
          return {
            type : that.type,
            source : 'youtube',
            authorId : Meteor.user()._id,
            pageToken : previousPageToken,
            searchQuery : query,
            title: element.title,
            description: element.description,
            referenceId: element.videoId,
            videoUsername : element.channelTitle,
            videoUsernameId : element.channelId,
            videoCreationDate : element.publishedAt.substring(0,10).replace( /(\d{4})-(\d{2})-(\d{2})/, "$2/$3/$1")
          }
        })
        .each(function(item) {
          SearchResults.insert(item);
        });
      that.loadingResults.set(false);
    });
    return;
  }
  return
};


Template.create_image_section.created = function() {
  this.source = new ReactiveVar();
  this.loadingResults = new ReactiveVar();
  this.type = 'image';
  this.source.set('flickr');
  this.focusResult = new ReactiveVar();
  this.page = 0;

  var that = this;

  var finishSearch = function(){
    that.loadingResults.set(false);
  };

  this.search = function(query) {
    var searchParams = {
      q: query,
      page: that.page
    };

    that.page = that.page + 1;

    that.loadingResults.set(true);
    searchDep.changed();


    var source = that.source.get();

    if (source === 'imgur') {
      Meteor.call('imgurImageSearchList', searchParams, function(err, results) {
        items = results.items;

        if (err) {
          console.log(err);
          return;
        }
        if (!items) {
          return;
        }
        _.chain(items)
        .filter(function(e) {
          return (e.type && e.type.indexOf('image') === 0)
        })
        .map(function(e) {
          return {
            type : that.type,
            source : source,
            authorId : Meteor.user()._id,
            searchQuery : query,
            referenceId : e.id,
            fileExtension: e.link.substring(e.link.lastIndexOf('.') + 1),
            section : e.section,
            title : e.title
          }
        })
        .each(function(item) {
          SearchResults.insert(item);
        });
        finishSearch();
      });
    } else if (source === 'flickr') {
      Meteor.call('flickrImageSearchList', searchParams, function(err, results) {
        items = results.items;

        if (err) {
          console.log(err);
          return;
        }
        if (!items) {
          return;
        }
        _.chain(items)
          .map(function(e) {
            return {
              type : that.type,
              source : source,
              authorId : Meteor.user()._id,
              searchQuery : query,
              farm: e.farm,
              secret: e.secret,
              id: e.id,
              server: e.server,
              title: e.title
            }
          })
          .each(function(item) {
            SearchResults.insert(item);
          });
        finishSearch();
      });
    }
    return;
  }
  return
};


Template.create_image_section.helpers({
    dataSources: [
      {source: 'imgur', display: 'Imgur'},
      {source: 'flickr', display: 'Flickr'},
      {source: 'getty', display: 'Getty Images'}
    ]
  }
);


Template.create_map_section.created = function() {
  return this.blockPreview = new ReactiveVar();
};

Template.create_map_section.helpers({
  url: function() {
    var preview = Template.instance().blockPreview.get();
    if (preview) {
      return preview.url()
    }
  },
  previewUrl: function() {
    var preview = Template.instance().blockPreview.get();
    if (preview) {
      return preview.previewUrl()
    }
  }
});



Template.create_map_section.events({
  "click .search": function(e, template) {
    var block, previewMapBlock;
    block = AutoForm.getFormValues('createMapSectionForm').insertDoc;
    previewMapBlock = new MapBlock(_.extend(block, {
      source: 'google_maps'
    }));
    return template.blockPreview.set(previewMapBlock);
  },
  "click .cancel": function() {
    Session.set('addingContext', false);
    return Session.set('editingContext', null);
  }
});


Template.create_text_section.helpers({
  startingBlock: function() {
    if (this instanceof ContextBlock) {
      return this;
    }
  }
});


// Template.create_image_section.events({
//   "click div.save": function(d) {
//     var context, description, horizontalIndex, horizontalSections, newDocument, parentSection, srcE, url;
//     srcE = d.srcElement ? d.srcElement : d.target;
//     parentSection = $(srcE).closest('section');
//     horizontalIndex = parentSection.data('index');
//     url = parentSection.find('input.image-url-input').val();
//     description = parentSection.find('input.image-description-input').val();
//     newDocument = {
//       type: 'image',
//       url: url,
//       description: description,
//       index: horizontalIndex
//     };
//     horizontalSections = Session.get('horizontalSections');
//     horizontalSections[Session.get('currentVertical')].data[horizontalIndex] = newDocument;
//     Session.set('horizontalSections', horizontalSections);
//     context = newDocument;
//     return renderTemplate(d, Template.display_image_section, context);
//   }
// });
