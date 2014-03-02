var pty = require('pty.js');
var fs  = require('fs');
var cp = require('child_process');
var path  = require('path');
//export PS1="\h:\w]\$ "
function run(socket, return_identifier, colid, shell, cols, cmd, cwd) {
  var env = process.env;
  env.TERM = "dumb";
  delete env.LS_COLORS;
  delete env.TERMCAP;
  var term = pty.spawn(shell, [], {
    name: 'dumb',
    cols: 100,
    rows: 25,
    cwd: cwd,
    env: env
  });
  var datacallnum = 0; 
  console.log(process.env);
  term.on('data', function(data) {
    if (socket) socket.emit('data',
                            {rid: return_identifier,
                             type: 'pty',
                             colid: colid,
                             tagkey: return_identifier,
                             data: data});
  });
  term.write(cmd+"\r");
  return term;
};

function open(res, cmd, cwd) {
  var fullpath = path.join(cwd, cmd);
  var output = "";
  var type = "dir";
  if (cmd.indexOf('/') === 0) {
    fullpath = cmd;
  }
  var newpath = fullpath;
  fs.lstat(fullpath, function (err, stats) {
    if (err) {
      output = JSON.stringify(err);
      res.send({output: output}); return;
    }
    if (stats.isFile()) {
      fs.readFile(fullpath, function (err, contents) {
        if (err) {
          output = JSON.stringify(err);
        } else {
          output = String(contents);
        }
        type = "file";
        res.send({output: output, cwd: newpath, type: type});
      });
    }
    if (stats.isDirectory()) {
      fs.readdir(fullpath, function(err, files) {
        if (err) {
          output = JSON.stringify(err);
        } else {
          output = files.join('\n');
        }
        res.send({output: output, cwd: newpath, type: type});
      });
    }
  });
};


exports.run = run;
exports.open = open;
//console.log(term.process);
