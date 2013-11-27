var express = require('express')
  , fs = require('fs')
  , _ = require('lodash')
  , procutil = require('./procutil')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

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
  res.sendfile(__dirname + '/index.html');
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

//io.sockets.on('connection', function (socket) {
//  socket.emit('news', { hello: 'world' });
//  socket.on('my other event', function (data) {
//    console.log(data);
// });
//});
