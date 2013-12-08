var sqlite3 = require('sqlite3').verbose();
var _ = require('underscore');

exports.init = function (db, cb) {
  db.run("create table frames ("+
         " id INTEGER PRIMARY KEY ASC,"+
         //" id TEXT PRIMARY KEY,"+
         " domId TEXT,"+
         " type TEXT,"+

         " outputEnd TEXT,"+
         " justSentCR INT,"+
         " previousCommand TEXT,"+
         " previousSelection TEXT,"+

         " content TEXT,"+
         " tag TEXT,"+
         " tagKey TEXT,"+
         " hasTagKey TEXT,"+

         " colId TEXT,"+
         " colDomId TEXT,"+
         " anchorId TEXT,"+
         " anchorDomId TEXT,"+
         " tagEdId TEXT,"+
         " tagEdDomId TEXT,"+
         " outEdId TEXT,"+
         " outEdDomId TEXT,"+

         " changed INT,"+
         " mode TEXT,"+
         " visibility TEXT,"+
         " placement INT,"+
         " height INT,"+
         " width INT)", cb);
};

/**
 * insert an object into table with properties of
 * the options map. send in an express response object
 * so i can return the id of the created record.
 * Ex:
 *   sql.insert(db, "frames", {tagKey: "x", colId: "3"})
 *     generates: 
 *   db.run("REPLACE INTO frames (tagKey, colId) VALUES (?, ?),
 *          "x", "3")
 */
exports.insert = function (res, db, table, options) {
  var qry = "replace into "+table+" ("+
            _.keys(options).join(", ") + ") values ("+
            _.map(_.keys(options),
                  function() {return "?";}).join(", ") + ") ";
  db.serialize(function () {
    db.run("begin transaction");
    db.run.apply(db, [qry].concat(_.values(options)));
    db.all("select last_insert_rowid() from "+table,
           function (err, rows) {
             var x = rows[0]["last_insert_rowid()"];
             res.send({id: x});
           });
    db.run("end transaction");
  });
};

/**
 * constraints is an array of objects, the key of which
 * is the column name, and the value of which is the 
 * constraint value. 
 * Ex:
 *   sql.del(db, frames, [{colId: "4"}])
 *     will generate
 *   db.run("delete from frames where colId = ?", 4);
 */
exports.delEq = function (res, db, table, constraints) {
  var qry = "delete from "+table+" where "+
            _.map(_.keys(constraints),
                  function(k) {
                    return k + "= ?";
                  }).join(" AND ") + " ";
  db.run.apply(db, [qry].concat(_.values(constraints)));
};

/**
 * this is for testing response sends because nodejs libraries
 * are usually fucking retarded for not providing any synchronous
 * versions of calls and enabling other hackers to write code with
 * resonably sane separation of concerns. holy shit, neckbeards.
 */
exports.fakeRes = function () { 
  this.send = function (xhr) {
    console.log(JSON.stringify(xhr));
  };
};
