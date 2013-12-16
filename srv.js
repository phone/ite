var express  = require('express')
  , fs       = require('fs')
  , _        = require('underscore')
  , path     = require('path')
  , sqlite3  = require('sqlite3').verbose()
  , sql      = require('./sql')
  , procutil = require('./procutil')
  , app      = express()
  , server   = require('http').createServer(app)
  , io       = require('socket.io').listen(server);

var spath = path.join(process.env.HOME, 'ite.session');
var db = new sqlite3.Database(spath);
sql.init(db, function () {
  sql.insert(new sql.fakeRes(), db, 'frames',
             {domId: "#1",
              type: "dir",
              outputEnd: null,
              justSentCR: false,
              previousCommand: null,
              previousSelection: null,
              content: "welcome",
              tag: process.env.HOME + ' Get Put Newcol Del',
              tagKey: process.env.HOME,
              hasTagKey: true,
              colId: "col1",
              colDomId: "#col1",
              anchorId: "anchor1",
              anchorDomId: "#anchor1",
              tagEdId: "tag1",
              outEdId: "out1",
              tagEdDomId: "#tag1",
              outEdDomId: "#out1",
              visibility: "max",
              mode: null,
              placement: 0,
              height: "auto",
              width: "auto"});
});

server.listen(8080);

app.use(express.bodyParser());
app.use(express.static('/'));
app.use('/static', express.static(__dirname+'/static'));
var socket = null;
var terminals = {};

io.sockets.on('connection', function (sock) {
  socket = sock;
  //socket.on('my other event', function (data) {
  //  console.log(data);
  //});
});

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/templates/index2.html');
});

app.post('/o', function (req, res) {
  var cwd  = req.body.cwd;
  var cmd  = req.body.cmd;
  var colid = req.body.colid;
  procutil.open(res, cmd, cwd);
});

app.post('/x', function (req, res) {
  var cwd  = req.body.cwd;
  var cmd  = req.body.cmd;
  var rid  = req.body.rid;
  var cols = req.body.cols;
  var colid = req.body.colid;
  console.log("rid: "+rid);
  if (_.has(terminals, rid)) {
    var term = terminals[rid];
    term.write(cmd + "\r");
  } else {
    var term = procutil.run(socket, rid, colid, 'bash', cols, cmd, cwd);
    terminals[rid] = term;
  }
  res.send(200);
});

app.post('/put', function (req, res) {
  var cwd  = req.body.cwd;
  var path = req.body.path;
  var content = req.body.content;
  var rid  = req.body.rid;
  fs.writeFile(path, content, function (err) {
    if (err) {
      socket.emit('data', {id: rid,
                           tagkey: cwd,
                           data: err});
    }
  });
  res.send(200);
});

/**
 * get all the frames. probably only using this now.
 */
app.get('/frames', function (req, res) {
  db.all("select * from frames order by placement",
         function (err, rows) {
           res.send(rows);
         });
});

/* operations on a specific frame */

app.post('/frames', function (req, res) {
  sql.insert(res, db, 'frames', _.omit(req.body,
                                       ["tagEd", "outEd"]));
});

app.get('/frames/:id', function (req, res) {
  db.each("select * from frames where id = ?",
           req.params.id,
           function (err, row) {
             res.send(row);
           });
});

app.patch('/frames/:id', function (req, res) {
  console.log("PATCH: " + req.body);
  sql.insert(res, db, 'frames', _.omit(req.body,
                                       ["tagEd", "outEd"]));
});

app.post('/frames/:id', function (req, res) {
  console.log("POST: " + req.body);
  console.log(req.body);
  sql.insert(res, db, 'frames', _.omit(req.body,
                                       ["tagEd", "outEd"]));
});

app.put('/frames/:id', function (req, res) {
  console.log("PUT: " + req.body);
  console.log(req.body);
  sql.insert(res, db, 'frames', _.omit(req.body,
                                       ["tagEd", "outEd"]));
});

app.delete('/frames/:id', function (req, res) {
  console.log("DELETE: " + req.body);
  sql.delEq(res, db, 'frames', {id: req.params.id});
  res.send({ok: "ok"});
});

