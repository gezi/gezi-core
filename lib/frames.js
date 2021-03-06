var db = require("./db");
var now = require("unique-now");
var loop = require("parallel-loop");
var parallel = require("parallelly");
var titleFromUrl = require("title-from-url");
var urls = require("./urls");
var keywords = require("./keywords");
var titles = require("./titles");
var initialized;

module.exports = {
  init: init,
  reset: reset,
  create: create,
  touch: touch,
  kill: kill,
  open: open,
  get: get,
  getByUrl: getByUrl,
  all: all,
  navigate: navigate
};

function all (callback) {
  db.query('SELECT * FROM frames ORDER BY ts DESC', callback);
}

function get (id, callback) {
  db.oneRow('SELECT * FROM frames WHERE id=?', [id], callback);
}

function getByUrl (url, callback) {
  url = urls.simplify(url);

  db.oneRow('SELECT * FROM frames WHERE url=?', [url], callback);
}

function open (url, callback) {
  getByUrl(url, function (error, frame) {
    if (frame) {
      touch(frame.id, function (error) {
        if(error) return callback(error);

        callback(undefined, frame.id);
      });
      return;
    }

    create(url, callback);
  });
}

function create (url, callback) {
  var id = now();

  db.query('INSERT INTO frames (id, url, ts) VALUES (?, ?, ?)', [id, urls.simplify(url), Date.now()], function (error) {
    if (error) return callback(error);
    callback(undefined, id);
  });
}

function touch (id, callback) {
  db.query('UPDATE frames SET ts=? WHERE id=?', [Date.now(), id], callback);
}

function navigate (id, url, callback) {
  getByUrl(url, function (error, frame) {
    if (frame) {
      touch(frame.id, function (error) {
        if(error) return callback(error);

        kill(id, function (error) {
          if(error) return callback(error);
          callback(undefined, frame.id);
        });
      });
      return;
    }

    db.query('UPDATE frames SET ts=?, url=? WHERE id=?', [Date.now(), urls.simplify(url), id], function (error) {
      if (error) return callback(error);
      callback(undefined, id);
    });
  });
}

function kill (id, callback) {
  db.query('DELETE FROM frames WHERE id = ?', [id], callback);
}

function init (callback) {
  if (initialized) return callback();

  initialized = true;

  db.query('CREATE TABLE IF NOT EXISTS frames (id integer primary key asc, url text unique, ts integer)', callback);
}

function reset (callback) {
  db.query('DROP TABLE IF EXISTS frames', function (err) {
    if (err) return callback(err);
    initialized = false;
    init(callback);
  });
}
