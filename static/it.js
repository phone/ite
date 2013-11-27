
$(document).ready(function () {
    TAG = 1;
    OUT = 2;
    tagopts = {"matchBrackets" : true,
               "autoCloseBrackets" : true,
               "mode" : "shell",
               "theme" : "tag",
               "indentWithTabs" : false,
               "lineWrapping" : true,
               "dragDrop" : false,
               "indentUnit" : 4};
    outopts = {"matchBrackets" : true,
               "autoCloseBrackets" : true,
               "dragDrop" : false,
               "lineWrapping" : true,
               "indentWithTabs" : false,
               "indentUnit" : 4};
    modes = {"js" : "javascript",
             "py" : "python",
             "clj" : "clojure",
             "go" : "go",
             "c" : "text/x-csrc",
             "cc" : "text/x-c++src",
             "cpp" : "text/x-c++src",
             "c++" : "text/x-c++src",
             "cs" : "text/x-csharp",
             "java" : "text/x-java",
             "ruby" : "text/x-ruby",
             "scala" : "scala",
             "sh" : "shell",
             "bash" : "shell",
             "pl" : "perl",
             "sql" : "sql",
             "tex" : "text/x-stex",
             "css" : "css",
             "html" : "text/html"}
    opts = [{}, tagopts, outopts];
    vm = new ViewModel();
    //vm.newFrame(null, true, null, "auto"); // the mainframe
    vm.newCol(null);
    ko.applyBindings(vm);
    window['vm'] = vm;
});

function allowDrop(ev) {
    ev.preventDefault();
    return false;
};

function drag(ev) {
    ev.dataTransfer.setData("text/plain",ev.target.parentNode.id);
    ev.dataTransfer.effectAllowed = "move";
    return false;
};

function drop(ev) {
    ev.preventDefault();
    var data = ev.dataTransfer.getData("text/plain");
    var srcColId = vm.framesById[data].colid;
    var node = ev.currentTarget;
    var target = $(node)
    var dstColId = target.attr("id").substring(3);
    if (node && srcColId !== dstColId) {
        vm.framesById[data].colid = dstColId;
        var wasHidden = vm.framesById[data].minimized;
        orig_node = document.getElementById(data);
        orig_node.parentNode = node;
        target.append(orig_node);
        vm.framesById[data].bigger();
        vm.rebalanceCol(srcColId, wasHidden, data);
    }
    return false;
};

FILE   = "file";
DIR    = "dir";
OUTPUT = "output";
PTY    = "pty";
ValidTypes = [FILE,OUTPUT,DIR,PTY];

EndsWith = function (list, item) { return (list[list.length - 1] === item); };

AutoSelect = function (e, cm) {
    if (e.which === 2 || (e.which === 1 && e.altKey) || e.which === 3) {
        var pos  = cm.getCursor();
        var line = cm.getLine(pos.line)
        var ctr  = line[pos.ch];
        if (cm.somethingSelected() || cm.prevSelection) {
            /* if something is selected, use the selection if we click inside it */
            var posidx   = cm.getDoc().indexFromPos(pos);
            var existart = null;
            var exiend   = null;
            if (cm.somethingSelected()) {
                existart = cm.getDoc().indexFromPos(cm.getCursor("anchor"));
                exiend   = cm.getDoc().indexFromPos(cm.getCursor("head"));
            } else {
                existart = cm.getDoc().indexFromPos(cm.prevSelection.anchor);
                exiend   = cm.getDoc().indexFromPos(cm.prevSelection.head);
            }
            var exidistance = existart - exiend;
            if (exidistance !== 0 && 
                ((posidx >= existart && posidx <= exiend) ||
                 (posidx <= existart && posidx >= exiend))) {
                if (cm.somethingSelected()) return;
                cm.setSelection(cm.prevSelection.anchor, cm.prevSelection.head);
                return;
            }
        }
        var selstart = ctr;
        var selend = ctr;
        for (var i = pos.ch;; i++) {
            if (!line[i] || /^[\s\/]$/.test(line[i])) {
                selstart = i;
                break;
            }
        }
        for (var i = pos.ch;; i--) {
            if (i === 0 || /^\s$/.test(line[i])) {
                selend = i;
                break;
            }
        }
        cm.setSelection(CodeMirror.Pos(pos.line, selstart),
                        CodeMirror.Pos(pos.line, selend));
    }
}

function Commands() {
    var self = this;
    self._it_Put = function() {
        vm.put();
    };
    self._it_Del = function(frame) {
        vm.delFrame(frame.id);
    };
    self._it_New = function(frame) {
        vm.newFrame(null, null, frame.colid, "auto");
    };
    self._it_Newcol = function() {
        vm.newCol();
    };
    self._it_Delcol = function(frame) {
        vm.delCol(frame.colid);
    };
};

function Editor(elt, frame, id, type, options) {
    var self = this;
    this.id = id;
    this.frame = frame;
    this.prevSelection = null;
    this.getCm = function () {
        return self.cm;
    };
    this.getDoc = function () {
        return self.cm.getDoc();
    };
    this.getTaged = function () {
        return self.frame.taged;
    };
    this.cm = CodeMirror(elt, opts[type]);
    self.cm.on("focus", function(cm) {
        vm.setFocusedEditor(self.id);
    });
    self.cm.on("beforeSelectionChange", function(cm, prevSelection, e) { 
        existart = cm.indexFromPos(prevSelection.anchor);
        exiend   = cm.indexFromPos(prevSelection.head);
        var exidistance = existart - exiend;
        if (exidistance !== 0) {
            cm.prevSelection = prevSelection;
        }
    });
    self.cm.on("contextmenu", function(cm, e) {
        setTimeout(function() {
            vm.setFocusedEditor(self.id);
            AutoSelect(e, cm);
            vm.open();
        }, 2);
        return false;
    });
    self.cm.on("mousedown", function(cm, e) {
        if (e.which === 1 && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
            cm.previousSelection = null;
        }
        if (e.which === 2 || (e.which === 1 && e.altKey)) {
            setTimeout(function() {
                vm.setFocusedEditor(self.id);
                AutoSelect(e, cm);
                vm.execute();
            }, 2);
        }
        return false;
    });
};

function Frame(id, isMainframe, colid, width) {
    var self = this;
    this.idify = function (id) { return "#" + id; };
    this.id = id;
    this.editors = [];
    this.ancid = "anc" + id;
    this.tagid = "tag" + id;
    this.outid = "out" + id;
    this.type = null;
    this.tagOnly = false;
    this.hasTagKey = false;
    this.hidden = false;
    this.minimized = false;
    this.isMainframe = isMainframe;
    this.colid = colid;
    this.width = width;
    this.outputEnd = null;
    this.setOutputEnd = function (pos) {
      self.outputEnd = pos;
    };
    this.getPtyCommandRange = function () {
      var cm = self.outed.cm;
      var cmdEnd = CodeMirror.Pos(cm.lastLine(),
                                  cm.getLine(cm.lastLine()).length);
      return {start: self.outputEnd, end: cmdEnd};
    };
    this.ptyCommand = function () {
      var cm = self.outed.cm;
      var range = self.getPtyCommandRange();
      return cm.getRange(range.start, range.end);
    };
    this.makePTY = function () {
      var ptykeys = {name: "pty",
                     Enter: function (cm) {
                              var range = self.getPtyCommandRange();
                              var cmd = self.ptyCommand();
                              vm.execute(cmd || "");
                              self.justSentCR = true;
                              self.previousCommand = cmd;
                              self.outed.cm.replaceRange(cmd + "\n",
                                                         range.start,
                                                         range.end);
                            }};
      self.outed.cm.addKeyMap(ptykeys);
    };
    this.notPTY = function () {
      self.outed.cm.removeKeyMap("pty");
    };
    this.setType = function (type) {
        if (ValidTypes.indexOf(type) >= 0) {
            self.type = type;
        }
    };
    this.isFile = function () { return self.type === FILE;};
    this.isOutput = function () { return self.type === OUTPUT;};
    this.isPty = function () { return self.type === PTY;};
    this.isDir = function () { return self.type === DIR;};
    this.getTagTokens = function () {
        var taged = self.taged;
        var doc = taged.getDoc();
        var tagtxt = doc.getLine(doc.firstLine());
        var tokens = tagtxt.split(" ");
        return tokens;
    };
    this.getTagKey = function () {
        return self.getTagTokens()[0];
    };
    this.setTagKey = function (tagKey) {
        var tagEd = self.taged;
        var tagLineIdx = tagEd.getDoc().firstLine();
        var line = tagEd.getDoc().getLine(tagLineIdx);
        var newLine = line;
        if (self.hasTagKey) {
            var currentTagKey = self.getTagKey();
            var tagKeyEndCh = 0;
            for (var i = 0;; i++) {
                if (!line[i] || /^\s$/.test(line[i])) {
                    tagKeyEndCh = i;
                    break;
                }
            }
            var lineExceptTagKey = line.substring(tagKeyEndCh, line.length);
            newLine = tagKey + " " + lineExceptTagKey;
            delete vm.framesByTag[currentTagKey];
        } else {
            if (tagKey !== line) {
                newLine = tagKey + " " + line; 
            }
        }
        vm.framesByTag[tagKey] = self;
        if (self.getTagKey() !== tagKey) {
            tagEd.getDoc().setLine(tagLineIdx, newLine);
        }
        self.hasTagKey = true;
    }
    this.getCwd = function () {
        var cwd = self.getTagTokens()[0];
        if (self.isFile() || self.isOutput() || self.isPty()) {
            cwd = cwd.substring(0, cwd.lastIndexOf("/"));
        }
        if (! EndsWith(cwd, "/")) {
            cwd = cwd.concat("/");
        }
        return cwd;
    };
    this.setCwd = function (cwd) {
        var tokens = self.getTagTokens();
        tokens[0] = cwd;
        var fl = tokens.join(" ");
        var doc = self.taged.getDoc();
        doc.setLine(doc.firstLine(), fl);
    };
    this.tagHeight = function() {
        return self.hidden ? 0 : $(self.idify(self.tagid)).height();
    };
    this.outHeight = function () {
        return (self.hidden || self.minimized) ? 0 : $(self.idify(self.outid)).height();
    };
    this.getHeight = function() {
        var height = 0;
        height += self.hidden ? 0 : $(self.idify(self.tagid)).height();
        height += self.minimized ? 0 : $(self.idify(self.outid)).height();
        return height;
    };
    this.resize = function() {
        self.taged.cm.setSize(self.colwidth, "auto");
        var outedHeight = 9999
        self.outed.cm.setSize(self.colwidth, outedHeight);
        if ($(window).height() > window.innerHeight) {
            var diff = $(window).height() - window.innerHeight;
            self.outed.cm.setSize(self.colwidth, outedHeight - diff);
        }
        $(self.idify(self.ancid)).removeClass("anchor").addClass("anchor-focused");
    };
    this.minimize = function() {
        self.minimized = true;
        $(self.idify(self.outid)).hide();
        $(self.idify(self.ancid)).removeClass("anchor-focused").addClass("anchor");
    };
    this.hideOthers = function() {
        _.each(_.keys(vm.framesById), function (i) {
            var fr = vm.framesById[i];
            if (fr.isMainframe) fr.minimize();
            if (fr.id === self.id || fr.minimized || fr.colid !== self.colid) return;
            fr.minimize();
        });
    };
    this.bigger = function() {
        self.hideOthers();
        self.minimized = false;
        $(self.idify(self.outid)).show();
        self.resize();
    };
    var htmldiv = 
        "<div id=\""+self.id+"\"> \n" +
        "  <span class=\"anchor\" ondragstart=\"drag(event)\" draggable=\"true\" id=\""+self.ancid+"\">&nbsp;&nbsp;&nbsp;&nbsp;</span>\n" +
        "  <div class=\"tag\" id=\""+self.tagid+"\"></div> \n" +
        "  <div id=\""+self.outid+"\"></div> \n" +
        "</div>";
    if (isMainframe) {
        $("#edit").append(htmldiv);
        $("#"+self.tagid).addClass("mainframe");
    } else {
        var col = $("#col"+self.colid);
        if (!col.length) {
            $("#top").append("<td ondragover=\"allowDrop(event)\" ondrop=\"drop(event)\"id=\"col"+self.colid+"\"></td>");
            col = $("#col"+self.colid);
        }
        col.append(htmldiv);
        var ncols = $("td").length;
        $("td").width($(document).width()/ncols);
        //$("#"+self.tagid).width(self.width);
        //$("#col"+self.colid).width(self.width);
    }
    
    self.taged = new Editor($(self.idify(self.tagid))[0],
                            self, self.tagid, TAG);
    self.outed = new Editor($(self.idify(self.outid))[0],
                            self, self.outid, OUT);
    self.editors.push(self.taged);
    self.editors.push(self.outed);
    self.bigger();
};

function ViewModel() {
    var self = this;
    this.framesByTag = {};
    this.framesById = {};
    this.columnIds = {};
    this.colwidth = $(document).width();
    this.commands = new Commands();
    this.editors = {};
    this.maxid = 0;
    this.columnCount = 0;
    this.focusedEditor = null;
    this.setFocusedEditor = function(id) {
        self.focusedEditor = self.editors[id];
    };
    this.get_cwd = function() {
        return self.focusedEditor.frame.getCwd();
    };
    this.get_selection = function() {
        if (self.focusedEditor.cm.somethingSelected()) {
            return self.focusedEditor.cm.getSelection() || "";
        }
        return "";
    };
    this.put = function() {
        var fe = self.focusedEditor;
        var path = fe.frame.getTagKey();
        var content = fe.frame.outed.getDoc().getValue();
        var data = { "path" : path, "content": content };
        post({'resource': '/put',
              'data': data,
              'success' : function (xhr) {
                  fe.frame.setTagKey(path);
                  fe.frame.hasTagKey = true;
                  return true;
              }});
    };
    this.open = function() {
        var fe = self.focusedEditor;
        var orig_sel = self.get_selection().trim() || "";
        var orig_cwd = self.get_cwd();
        if (orig_sel) {
            var data = { "cmd" : orig_sel,
                         "colid" : fe.frame.colid,
                         "cwd" : orig_cwd };
            post({'resource': '/o',
                  'data': data,
                  'success': function (xhr) {
                      if (!fe.frame.hasTagKey) {
                          fe.frame.setTagKey(orig_sel);
                      }
                      var output = xhr.output;
                      var cwd = xhr.cwd;
                      var type = xhr.type;
                      var targetFrame = null;
                      if (_.has(self.framesByTag, cwd)) {
                          targetFrame = self.framesByTag[cwd];
                      } else {
                          targetFrame = self.newFrame(cwd, null, fe.frame.colid);
                      }
                      targetFrame.outed.getDoc().setValue(output);
//                      targetFrame.taged.setCwd(cwd);
                      if (type === FILE) {
                          targetFrame.setType(FILE);
                          var ext = cwd.substring(cwd.split(" ")[0].lastIndexOf(".")+1);
                          var mode = modes[ext];
                          if (mode) {
                              targetFrame.outed.cm.setOption("mode", mode);
                          }
                      } else {
                          targetFrame.outed.cm.setOption("mode", "shell");
                          targetFrame.setType(DIR);
                      }
                      if (targetFrame.minimized) {
                          targetFrame.bigger();
                      }
                  }});
        }};
    this.execute = function(force_command) {
        var fe = self.focusedEditor;
        var sel_orig = "";
        if (!force_command && force_command !== "") {
          sel_orig = self.get_selection().trim() || "";
        } else {
          sel_orig = force_command;
        }
        var cwd_orig = self.get_cwd();
        if (sel_orig) {
            var nssel = "_it_" + sel_orig;
            if (nssel in self.commands) {
                self.commands[nssel](fe.frame);
            } else {
                var rid = fe.frame.type===PTY ? fe.frame.getTagKey() : cwd_orig+"+REPL";
                var data = { "cmd" : sel_orig,
                             "rid" : rid,
                             "colid" : fe.frame.colid,
                             "cwd" : cwd_orig };
                post({'resource': '/x',
                      'data': data,
                      'success': function (xhr) {
                          var cwd = cwd_orig + "+Output";
                          //if (!fe.frame.hasTagKey) {
                          //    fe.frame.setTagKey(cwd);
                          //}
                          //var output = xhr.output;
                          //var targetFrame = null;
                          //if (_.has(self.framesByTag, cwd)) {
                          //    targetFrame = self.framesByTag[cwd];
                          //} else {
                          //    targetFrame = self.newFrame(cwd, null, fe.frame.colid);
                          //}
                          //targetFrame.outed.getDoc().setValue(output);
                          //targetFrame.setType(OUTPUT);
                          //if (targetFrame.minimized) {
                          //    targetFrame.bigger();
                          //}
                      }});
            }
        }};
    this.newFrame = function(tagKey, isMainframe, colid, width) {
        var id = id ? id : _.uniqueId();
        var f = new Frame(id, isMainframe, colid, width);
        for (var i = 0; i < f.editors.length; i++) {
            var eid = f.editors[i].id;
            self.editors[eid] = f.editors[i];
        }
        if (tagKey) {
            f.setTagKey(tagKey)
            self.framesByTag[tagKey] = f;
        }
        self.framesById[id] = f
        return f;
    };
    this.rebalanceCol = function(colId, wasHidden, frameId) {
        var done = false;
        _.each(_.keys(vm.framesById), function (fid) {
            if (done) return;
            var f = vm.framesById[fid];
            if (wasHidden) {
                if (f.colid === colId) {
                    if (!f.minimized) {
                        f.bigger();
                        done = true;
                    }
                }
            } else {
                if (f.colid === colId) {
                    if (f.id !== frameId) {
                        f.bigger();
                        done = true;
                    }
                }
            }
        });
    };
    this.delReferences = function(frame) {
        _.each(frame.editors, function(e) {
            delete vm.editors[e.id];
        });
        delete vm.framesByTag[frame.getTagKey()];
        delete vm.framesById[frame.id];
    };
    this.delFrame = function(frameId) {
        var frame = self.framesById[frameId];
        var wasHidden = frame.minimized;
        var srcColId = frame.colid;
        $("#"+frameId).remove();
        self.delReferences(frame);
        self.rebalanceCol(srcColId, wasHidden, frameId);
    };
    this.newCol = function(tagKey) {
        self.columnCount ++;
        var newColId = _.uniqueId();
        var newFrame = self.newFrame(tagKey, false, newColId, "auto");
        self.columnIds[newColId] = newFrame;
        return newFrame
    };
    this.delCol = function(colId) {
        self.columnCount --;
        _.each(_.keys(self.framesById), function (fid) {
            var frame = self.framesById[fid];
            if (frame.colid === colId) {
                self.delReferences(frame);
            }
        });
        $("#col"+colId).remove();
        $("td").width($(document).width()/self.columnCount);
    };
    this.getTargetFrame = function (rid, colid, tagkey) {
      var targetFrame = null;
      if (_.has(self.framesById, rid)) {
        targetFrame = self.framesById[rid];
      } else {
        if (_.has(self.framesByTag, tagkey)) {
            targetFrame = self.framesByTag[tagkey];
        } else {
            targetFrame = self.newFrame(tagkey, null, colid);
        }
      }
      return targetFrame;
    };
    var socket = io.connect('http://localhost:8080');
    socket.on('data', function (data) {
      var rid = data.rid;
      var colid = data.colid;
      var tagkey = data.tagkey;
      var type = data.type;
      var output = data.data;
      var targetFrame = self.getTargetFrame(rid, colid, tagkey);
      var curVal = '';
      if (targetFrame.outed.cm.getValue() === "" && type === PTY) {
        targetFrame.makePTY();
      }
      if (targetFrame.justSentCR &&
          output.replace(/^[\s\r]+|[\s\r]+$/g,'') === targetFrame.previousCommand) {
        // previousCommand only gets set for typed commands. clicked commands don't
        // echo on the prompt, so it's ok to let the terminal print it.
        return;
      } else {
        targetFrame.justSentCR = false;
      }
      if (type === PTY) {
        curVal = targetFrame.outed.cm.getValue();
      }
      targetFrame.outed.cm.setValue(curVal + output);
      var lineno = targetFrame.outed.cm.lastLine();
      var lastline = targetFrame.outed.cm.getLine(lineno);
      var end = CodeMirror.Pos(lineno, lastline.length);
      targetFrame.outed.cm.setCursor(end);
      targetFrame.setOutputEnd(end);
      if (targetFrame.type === null) {
        targetFrame.setType(type);
      }
      if (targetFrame.minimized && curVal === '') {
        targetFrame.bigger();
      }
    });
    $("#top").on("contextmenu", function(e) {
        if (e.target.className === "anchor") {
            self.framesById[parseInt($(e.target.parentNode).attr("id"))].bigger();
        } 
        return false;
    });
};

