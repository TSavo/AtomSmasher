var Client = require('instagram-private-api').V1;
var device = new Client.Device('worldscollidingstore');
var _ = require("underscore");
var storage = new Client.CookieFileStorage(__dirname + '/cookies/worldscollidingstore.json');
var csp = require("js-csp");
var messages = ["This is so great.", "Wonderful!", "This is great!", "Love this!", "I love this.", "Fantastic!", "Love it!", "More like this please!", ":)", "<3", "I so love this...", "Yes!", "Fantastic.", "Wonderful.", "Please, more like it! :)", "We need more like this. <3"];
var suffix = ["", "", "", "", "", "", "", "", "", "", " :)", " <3", " <3 <3 <3", " Yes!", " Thank you!", " Can we get more like it?", "👍👋", "😍", "❤"];
var hashtags = ["thewalkingdead", "walkingdead", "gameofthrones", "residentevil", "harrypotter", "mrrobot"];

function go() {
  // And go for login
  Client.Session.create(device, storage, 'worldscollidingstore', 'Zabbas4242!')
    .then(function(session) {
      // Now you have a session, we can follow / unfollow, anything...
      // And we want to follow Instagram official profile
      //return [session, Search(session, "walkingdead")];
      //MediaComments(session).then(function(comments){
      //  console.log(comments);
      //});
      return [session, new Client.Feed.TaggedMedia(session, hashtags[parseInt(Math.random() * hashtags.length)]).get()]
        //return [session, (new Client.Feed.SelfLiked(session)).get()]
    }).spread(function(session, media) {
      var selector = parseInt(Math.random() * media.length);
      var choice = media[selector];
      console.log("Found: " + choice.id + " [" + choice._params.caption + "] by " + choice.account._params.username);
      if (Math.random() > 0.5) {
        delay(function() {
          Follow(session, choice.account);
        });
      }
      delay(function() {
        Like(session, choice);
      });
      if (Math.random() > 0.5) {
        delay(function() {
          Comment(session, choice, messages[parseInt(Math.random() * messages.length)] + suffix[parseInt(Math.random() * suffix.length)]);
        });
      }
    });
  
  setTimeout(go, 100000 + Math.random() * 100000)
}

go();


//   .spread(function(session, hashtag) {
//      console.log(hashtag[0]);
//return Client.Like.create(session, hashtag[36].id);
//        return Client.Relationship.create(session, account.id);
// })
//.then(function(relationship) {
//    console.log(relationship)
// {followedBy: ... , following: ... }
// Yey, you just followed @instagram
//})


function delay(fun) {
  setTimeout(fun, 15000 + (Math.random() * 80000));
}

function Like(instagramSession, media) {
  console.log("Liked: " + media._params.caption);
  return Client.Like.create(instagramSession, media.id)
}

function Search(instagramSession, hashtag) {
  return new Client.Feed.TaggedMedia(instagramSession, hashtag).get()
}

function Comment(instagramSession, media, comment) {
  console.log("Commented: " + comment);
  return Client.Comment.create(instagramSession, media.id, comment);
}

function Follow(instagramSession, account) {
  console.log("Followed: " + account._params.username);
  return Client.Relationship.create(instagramSession, account.id);
}

function FindUser(instagramSession, username) {
  return Client.Account.searchForUser(instagramSession, username);
}

function Inbox(instagramSession){
  return new Client.Feed.Inbox(instagramSession).get();
}

function MediaComments(instagramSession){
  return new Client.Feed.MediaComments(instagramSession).get();
}