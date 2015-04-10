Stories._ensureIndex({
  shortId: 1
}, {
  unique: 1
});

Meteor.publish("exploreStoriesPub", function(filter, category, skip) {
  return Stories.find({
    published: true
  },{
    fields : {
      draftStory: 0,
      history: 0
    }
  });
});

Meteor.publish("readStoryPub", function(userPathSegment, shortId) {
  return Stories.find({
    userPathSegment: userPathSegment,
    shortId: shortId,
    published: true
  },{
    fields : {
      draftStory: 0,
      history: 0
    }
  });
});

Meteor.publish("readStoriesPub", function(ids) {
  return Stories.find({
    _id: {
      $in: ids
    },
    published: true
  });
});

Meteor.publish("createStoryPub", function(userPathSegment, shortId) {
  return Stories.find({
    userPathSegment: userPathSegment,
    shortId: shortId
  });
});

Meteor.publish("storiesPub", function() {
  return Stories.find();
});

Meteor.publish("contextBlocksPub", function() {
  return ContextBlocks.find({},{
    fields : {
      fullDetails: 0
    }
  });
});

Meteor.publish("userProfilePub", function(username) {
  var user = Meteor.users.find({
    username: username.toLowerCase()
  });

  var userId = user.map(function(doc) {
    return doc._id;
  });

  var userCursor;
  if (!userId) {
    this.ready();
    return;
  }
  if (this.userId == userId[0]) {
    //return full document
    userCursor = Meteor.users.find(this.userId, {
      fields: {
        "profile" : 1,
        "username" : 1,
        "emails" : 1,
        "services": 1
      }
    });
  } else {
    //return public profile
    userCursor = Meteor.users.find(userId[0], {
      fields: {
        "profile" : 1,
        "username" : 1,
        "services": 1
      }
    });
  }
  var userFavorites = (userCursor.fetch()[0]).profile.favorites;
  return [userCursor, Stories.find({
                        _id: {
                          $in: userFavorites
                        }})]
});

Meteor.publish("userStoriesPub", function(username) {
  var user = Meteor.users.find({
    username: username.toLowerCase()
  });
  var userId = user.map(function(doc) {
    return doc._id;
  });
  if (!userId) {
    this.ready();
    return;
  }
  return Stories.find({
    authorId: userId[0]
  },{
    fields : {
      history: 0
    }
  });
});

Meteor.publish("tempUsernamePub", function() {
  if (this.userId) {
    return Meteor.users.find(this.userId, {
      fields: {
        'tempUsername': 1
      }
    });
  } else {
    this.ready();
  }
});

// this publishes info one server facts (used on /stats page)
Facts.setUserIdFilter(function (userId) {
  var user = Meteor.users.findOne(userId);
  return user && user.admin;
});
