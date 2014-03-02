$(document).ready(function () {
    tagopts = {"matchBrackets" : true,
               "autoCloseBrackets" : true,
               "mode" : null,
               "theme" : "tag",
               "indentWithTabs" : false,
               "keyMap" : "vim",
               //"lineWrapping" : false,
               "dragDrop" : false,
               "indentUnit" : 4};
    outopts = {"matchBrackets" : true,
               "autoCloseBrackets" : true,
               "dragDrop" : false,
               "keyMap" : "vim",
               //"lineWrapping" : false,
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
    focusedEditor = null;
    commands = new Commands();
    vm = new Screen();
    //vm.newFrame(null, true, null, "auto"); // the mainframe
    //vm.newCol(null);
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
  var frames = vm.get("frames");
  var movingFrame = frames.get(data);
  var srcColId = movingFrame.get("colId");
  var node = ev.currentTarget;
  var target = $(node)
  var dstColId = target.attr("id");
  orig_node = document.getElementById(data);
  if (node && srcColId !== dstColId) {
    movingFrame.set({colId: dstColId,
                     colDomId: "#"+dstColId});
    var wasHidden = movingFrame.get("visibility") === HID;
    orig_node.parentNode = node;
    target.append(orig_node);
    movingFrame.bigger();
    vm.rebalanceCol(wasHidden, srcColId, movingFrame.id);
  } else if (node && srcColId === dstColId) {
    var dropY = ev.y;
    var colFrames = $("#"+srcColId).children();
    var done = false;
    var prev = null;
    var getEltPlacement = function (elt) {
      return vm.get("frames").get($(elt).attr("id")).get("placement");
    };
    colFrames.map(function (idx) {
      if (done) return;
      var elt = $(colFrames[idx]);
      if (elt.position().top > dropY) {
        if ((prev === null) || (prev && prev.position().top < dropY)) {
          elt.before($(orig_node));
          movingFrame.set({placement: parseInt(getEltPlacement(elt))});
          vm.get("frames").where({colId: srcColId}).forEach(function (frame) {
            if (frame.id === movingFrame.id) return;
            var fplac = frame.get("placement");
            if (fplac >= movingFrame.get("placement")) {
              frame.set("placement", fplac + 1);
            }
          });
          done = true;
        } else {
          prev = elt;
        }
      } else { // pure resize

      }
    });
    if (!done) {
      var elt = $(colFrames[colFrames.length -1]);
      if (elt.position().top < dropY) {
        elt.after(orig_node);
        movingFrame.set({placement: parseInt(getEltPlacement(elt)) + 1});
        done = true;
      }
    }
    if (done) {
      vm.get("frames").sort();
      movingFrame.bigger();
      vm.rebalanceCol(true, srcColId, movingFrame.id);
    }
  }
  return false;
};

DEFAULTTAGNC = " Put New Del Newcol Delcol ";
DEFAULTTAG = " Put New Del ";
DEFAULTTAGPY = " Put New Del python ";
DEFAULTTAGJS = " Put New Del node ";
DEFAULTTAGCLJ = " Put New Del lein repl ";

TAG = 1;
OUT = 2;

MIN = "min";
MAX = "max";
HID = "hid";
CUS = "cus";
ValidVisibilities = [MIN,MAX,HID,CUS];

FILE   = "file";
DIR    = "dir";
PTY    = "pty";
ValidTypes = [FILE,DIR,PTY];

EndsWith = function (list, item) { return (list[list.length - 1] === item); };

AutoSelect = function (e, cm) {
    if (e.which === 2 || (e.which === 1 && e.altKey) || e.which === 3) {
        var pos  = cm.getCursor();
        var line = cm.getLine(pos.line)
        var ctr  = line[pos.ch];
        if (cm.somethingSelected() || cm.prevSelection) {
            /* if something is selected, use the selection if we click inside it */
            var posidx   = cm.indexFromPos(pos);
            var existart = null;
            var exiend   = null;
            if (cm.somethingSelected()) {
                existart = cm.indexFromPos(cm.getCursor("anchor"));
                exiend   = cm.indexFromPos(cm.getCursor("head"));
            } else {
                existart = cm.indexFromPos(cm.prevSelection.anchor);
                exiend   = cm.indexFromPos(cm.prevSelection.head);
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
};

function Commands() {
    var self = this;
    self._it_Put = function(frame) {
        vm.put();
    };
    self._it_Del = function(frame) {
      frame.destroy();
    };
    self._it_New = function(frame) {
        vm.get("frames").add({tag: DEFAULTTAG,
                              colId: frame.get("colId")
                             });
    };
    self._it_Newcol = function() {
        vm.newCol("");
    };
    self._it_Delcol = function(frame) {
      vm.delCol(frame.get("colId"), frame.get("colDomId"));
    };
};

var Editor = Backbone.Model.extend({
  defaults: {
    frame: null,
    cm: null,
    content: null,
    type: TAG,
    changed: false
  },

  render: function () {
    eltSel = this.get("type") === TAG ? "tagEdDomId" : "outEdDomId";
    var elt = $(this.get("frame").get(eltSel))[0];
    this.set({cm : CodeMirror(elt, opts[this.get("type")])});
    this.get("cm").setOption("mode", this.get("frame").get("mode"));
    this.get("cm").setValue(this.get("content") || "");
  },

  register: function () {
    var self = this;
    this.get("cm").on("focus", function(cm) {
      focusedEditor = self;
    });
    this.get("cm").on("beforeSelectionChange", function (cm, prevSelection, e) { 
      existart = cm.indexFromPos(prevSelection.anchor);
      exiend   = cm.indexFromPos(prevSelection.head);
      var exidistance = existart - exiend;
      if (exidistance !== 0) {
        cm.prevSelection = prevSelection;
      }
    });
    this.get("cm").on("contextmenu", function (cm, e) {
      setTimeout(function () {
        focusedEditor = self;
        AutoSelect(e, cm);
        vm.open();
      }, 2);
      return false;
    });
    this.get("cm").on("change", function (cm, ch) {
      self.set({changed: true});
    }),
    this.get("cm").on("mousedown", function (cm, e) {
        if (e.which === 1 && !e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
          cm.prevSelection = null;
        }
        if (e.which === 2 || (e.which === 1 && e.altKey)) {
          setTimeout(function () {
            focusedEditor = self;
            AutoSelect(e, cm);
            vm.execute();
          }, 2);
        }
        return false;
    });
  }
});

var Frame = Backbone.Model.extend({
  defaults: {
    placement: null,
    width: 0,
    height: 0,
    domId: null,
    tag: null,
    tagKey: null,
    content: null,
    colId: null,
    colDomId: null,
    hasTagKey: false,
    anchorId: null,
    anchorDomId: null,
    tagEdDomId: null,
    changed: false,
    tagEd: null,
    outEdDomId: null,
    outEd: null,
    type: null,
    mode: null,
    visibility: MAX,
    outputEnd: null,
    previousCommand: null,
    justSentCR: false,
  },

  initialize: function () {
    this.set({colDomId: "#" + this.get("colId")});
    if (this.get("tagKey")) {
      this.set({hasTagKey: true});
    }
  },

  render: function (screenDomId) {
    var col = $(this.get("colDomId"));
    if (this.get("placement") === null) {
      this.set({placement: col.children().length});
    }
    var tagEd = new Editor({content: this.get("tag"),
                            id: "tag" + this.id,
                            type: TAG,
                            frame: this});
    var outEd = new Editor({content: this.get("content"),
                            id: "out" + this.id,
                            type: OUT,
                            frame: this});
    this.set({tagEd: tagEd,
              outEd: outEd
             });
    var htmldiv = 
      "<div class=\"frame\" id=\""+this.id+"\"> \n" +
      "  <span class=\"anchor\" ondragstart=\"drag(event)\"" +
      "        draggable=\"true\" "+
      "        id=\""+this.get("anchorId")+"\">&nbsp;&nbsp;&nbsp;&nbsp;" +
      "  </span>\n" +
      "  <div class=\"tag\" id=\""+this.get("tagEd").id+"\"></div> \n" +
      "  <div id=\""+this.get("outEd").id+"\"></div> \n" +
      "</div>";
    if (!col.length) {
      $(screenDomId).append("<td>" +
                            "	<div class=\"column\" "+
                            "        id=\""+this.get("colId")+"\" "+
                            "        ondragover=\"allowDrop(event)\"" +
                            "        ondrop=\"drop(event)\" ></div>"+
                            "</td>");
      col = $(this.get("colDomId"));
    }
    col.append(htmldiv);
    cols = $(".column")
    var ncols = cols.length;
    colwidth = $(window).width()/ncols;
    cols.width(colwidth);
    var wwidth = $(window).width();
    var dwidth = $(document).width();
    var widthdiff = (dwidth - wwidth)/ncols;
    cols.width(colwidth - widthdiff);
    tagEd.render();
    outEd.render();
    tagEd.register();
    outEd.register();
    this.bigger();
    this.trigger("setupDone", this);
    this.on("change:visibility change:tagKey change:hasTagKey change:previousSelection change:colId change:colDomId change:placement", function (model, coll, opts) {
      model.set("changed", true);
    });
    this.set("changed", true);
    var self = this;
    setInterval(function () {
      var tagEd = self.get("tagEd");
      var outEd = self.get("outEd");      
      if (tagEd.get("changed") ||
          outEd.get("changed") ||
          self.get("changed")) {
        tagEd.set("changed", false);
        outEd.set("changed", false);
        self.set("changed", false);
        self.set({tag: tagEd.get("cm").getValue(),
                  content: outEd.get("cm").getValue()
                 });
        self.save(_.omit(self.attributes, ["changed", "tagEd", "outEd"]), {patch: true});
      }
    }, 3500);
  },
  
  getPtyCommandRange: function () {
    var cm = this.get("outEd").get("cm");
    var cmdEnd = CodeMirror.Pos(cm.lastLine(),
                                cm.getLine(cm.lastLine()).length);
    return {start: this.get("outputEnd"), end: cmdEnd};
  },
  getPtyCommand: function () {
    var cm = this.get("outEd").get("cm");
    var range = this.getPtyCommandRange();
    return cm.getRange(range.start, range.end);
  },
  makePty: function () {
    var self = this;
    var ptykeys = {name: "pty",
                   Enter: function (cm) {
                            var range = self.getPtyCommandRange();
                            var cmd = self.getPtyCommand();
                            vm.execute(cmd || "");
                            self.set({justSentCR : true,
                                      previousCommand : cmd});
                            self.get("outEd").get("cm").replaceRange(cmd + "\n",
                                                                     range.start,
                                                                     range.end);
                          }};
    this.get("outEd").get("cm").addKeyMap(ptykeys);
  },
  notPty: function () {
    this.get("outEd").get("cm").removeKeyMap("pty");
  },
  setType: function (type) {
    if (ValidTypes.indexOf(type) >= 0)
      this.set({type : type});
  },
  getTagKey: function () {
    /* default tag checking, etc, fuck */
    if (this.get("hasTagKey")) {
      var cm = this.get("tagEd").get("cm");
      var fl = cm.getLine(cm.firstLine());
      return fl.split(" ")[0];
    } else {
      return null;
    }
  },
  setTagKey: function (tagKey) {
    if (this.getTagKey() !== tagKey) {
      return;
    }
    var tagLineIdx = this.get("tagEd").firstLine();
    var line = this.get("tagEd").getLine(tagLineIdx);
    var newLine = line;
    if (this.get("hasTagKey")) {
      var currentTagKey = this.getTagKey();
      var tagKeyEndCh = 0;
      for (var i = 0;; i++) {
        if (!line[i] || /^\s$/.test(line[i])) {
          tagKeyEndCh = i;
          break;
        }
      }
      var lineExceptTagKey = line.substring(tagKeyEndCh, line.length);
      newLine = tagKey + " " + lineExceptTagKey;
    } else {
      if (tagKey !== line) {
        newLine = tagKey + " " + line; 
      }
    }
    this.hasTagKey = true;
    this.tagKey = tagKey;
  },
  getCwd: function () {
    var cwd = this.get("tagKey");
    if (!cwd) return "";
    if ([FILE, PTY].indexOf(this.get("type")) >= 0)
      cwd = cwd.substring(0, cwd.lastIndexOf("/"));
    if (! EndsWith(cwd, "/"))
      cwd = cwd.concat("/");
    return cwd;
  },
  tagHeight: function() {
    return this.get("visibility")===HID ? 0 : $(this.get("tagEdDomId")).height();
  },
  outHeight: function () {
    if ([HID, MIN].indexOf(this.get("visibility")) >= 0)
      return 0;
    return $(this.get("outEdDomId")).height();
  },
  getHeight: function () {
    var height = 0;
    height += this.get("visibility")===HID ? 0 : $(this.get("tagEdDomId")).height();
    if ([HID, MIN].indexOf(this.get("visibility")) < 0)
      height += $(this.get("outEdDomId")).height();
    return height;
  },
  resize: function () {
    this.get("tagEd").get("cm").setSize(this.get("width"), "inherit");
    var outedHeight = 9999
    this.get("outEd").get("cm").setSize(this.get("width"), outedHeight);
    if ($(window).height() > window.innerHeight) {
      var diff = $(window).height() - window.innerHeight;
      this.get("outEd").get("cm").setSize(this.get("width"), outedHeight - diff);
    }
    $(this.get("anchorDomId")).removeClass("anchor").addClass("anchor-focused");
  },
  minimize: function () {
    this.set({visibility : MIN});
    $(this.get("outEdDomId")).hide();
    $(this.get("anchorDomId")).removeClass("anchor-focused").addClass("anchor");
  },
  hideOthers: function () {
    var self = this;
    vm.get("frames").where({colId: this.get("colId")}).forEach(function (fr) {
      if (fr.id === self.id || fr.get("visibility") === MIN)
        return;
      fr.minimize();
    });
  },
  bigger: function () {
    this.hideOthers();
    this.set({visibility : MAX});
    $(this.get("outEdDomId")).show();
    this.resize();
  }
});

var Frames = Backbone.Collection.extend({
  comparator: 'placement',
  model: Frame,
  url: '/frames'
});

var Screen = Backbone.Model.extend({
  defaults: {
    domId: "#top",
    frames: new Frames(),
    columnCount: 0,
    colWidth: 0, //$(document).width(),
  },
  initialize: function () {
    var self = this;
    this.set({colWidth : $(document).width()});
    this.register();
  },
  
  register: function () {
    var self = this;
    var inits = 0;
    var totallyinitialized = false;
    $(this.get("domId")).on("contextmenu", function (e) {
        if (e.target.className === "anchor")
            self.get("frames").get([parseInt($(e.target.parentNode).attr("id"))]).bigger();
        return false;
    });
    this.get("frames").on("add", function (model, collection, options) {
      model.save(model.attributes,
                 {success: function (m, xhr, o) {
        console.log("wat?");
        var id = m.id;
        m.set({"domId": "#" + id
              ,"anchorId": "anchor" + id
              ,"anchorDomId": "#anchor" + id
              ,"tagEdDomId": "#tag" + id
              ,"outEdDomId": "#out" + id
              ,"tagEdId": "tag" + id
              ,"outEdId": "out" + id
              ,"width": "inherit"
              ,"height": "auto"
              });
        m.save(m.attributes);
        m.render(vm.get("domId"));
        if (!totallyinitialized && ++inits === vm.get("frames").length) {
          vm.get("frames").forEach(function (frame) {
            if (frame.get("origvis") === MAX) {
              frame.bigger();
            }
            frame.unset("origvis");
          });
          totallyinitialized = true;
        }
      }});
    }).on("destroy", function (model, collection, options) {
      var wasHidden = model.get("visibility") === MIN;
      var srcColId = model.get("colId");
      $(model.get("domId")).remove();
      vm.rebalanceCol(wasHidden, srcColId, model.id);
    });
    this.get("frames").fetch({success: function (coll, resp, opts) {
      console.log(coll);
      coll.forEach(function (o) {
        o.set("origvis", o.get("visibility"));
      });
    }});
    var socket = io.connect('http://localhost:8080');
    socket.on('data', function (data) {
      var rid = data.rid;
      var colid = data.colid;
      var tagkey = data.tagkey;
      var type = data.type;
      var output = data.data;
      self.getTargetFrame(rid, colid, tagkey, function (targetFrame) {
        var curVal = '';
        var outEd = targetFrame.get("outEd");
        var outEdCm = outEd.get("cm");
        if (outEdCm.getValue() === "" && type === PTY) {
          targetFrame.makePty();
        }
        if (targetFrame.get("justSentCR") &&
            output.replace(/^[\s\r]+|[\s\r]+$/g,'')===targetFrame.get("previousCommand")) {
          // previousCommand only gets set for typed commands. clicked commands don't
          // echo on the prompt, so it's ok to let the terminal print it.
          return;
        } else {
          targetFrame.set({justSentCR : false});
        }
        if (type === PTY) {
          curVal = outEdCm.getValue();
        }
        outEdCm.setValue(curVal + output);
        var lineno = outEdCm.lastLine();
        var lastline = outEdCm.getLine(lineno);
        var end = CodeMirror.Pos(lineno, lastline.length);
        outEdCm.setCursor(end);
        targetFrame.set({outputEnd : end});
        if (targetFrame.get("type") === null) {
          targetFrame.setType(type);
        }
        if (targetFrame.get("visibility")===MIN && curVal === '') {
          targetFrame.bigger();
        }
      });
    });
  },
  
  getCwd: function () { return focusedEditor.get('frame').getCwd(); },
  getSelection: function () {
    if (focusedEditor.get("cm").somethingSelected())
      return focusedEditor.get("cm").getSelection() || "";
    return "";
  },
  put: function () {
    var fe = focusedEditor;
    var path = fe.get("frame").getTagKey();
    var content = fe.get("frame").get("outEd").get("cm").getValue();
    var data = { "path" : path, "content": content };
    post({'resource': '/put',
          'data': data,
          'success' : function (xhr) {
                        fe.get("frame").setTagKey(path);
                        fe.get("frame").set({hasTagKey: true});
                        return true;
                      }});
  },
  open: function () {
    var self = this;
    var fe = focusedEditor;
    var orig_sel = self.getSelection().trim() || "";
    var orig_cwd = self.getCwd();
    if (orig_sel) {
      var data = { "cmd" : orig_sel,
                   "colid" : fe.get("frame").get("colId"),
                   "cwd" : orig_cwd };
      post({'resource': '/o',
            'data': data,
            'success': function (xhr) {
                if (!fe.get("frame").get("hasTagKey")) {
                  fe.get("frame").setTagKey(orig_sel);
                }
                var output = xhr.output;
                var cwd = xhr.cwd;
                var type = xhr.type;
                self.getTargetFrame(
                  null,
                  fe.get("frame").get("colId"),
                  cwd,
                  function (targetFrame) {
                    var outEd = targetFrame.get("outEd");
                    var outEdCm = targetFrame.get("outEd").get("cm");
                    var tagEd = targetFrame.get("tagEd");
                    var tagEdCm = targetFrame.get("tagEd").get("cm");
                    outEdCm.setValue(output);
                    tagEdCm.setOption("mode", null);
                    if (type === FILE) {
                      targetFrame.setType(FILE);
                      var ext = cwd.substring(cwd.split(" ")[0].lastIndexOf(".")+1);
                      var mode = modes[ext];
                      targetFrame.set("mode", mode);
                      if (mode) {
                        outEdCm.setOption("mode", mode);
                      }
                    } else {
                      outEdCm.setOption("mode", "shell");
                      targetFrame.setType(DIR);
                    }
                    if (targetFrame.get("visibility") === MIN) {
                      targetFrame.bigger();
                    }
                });
            }});
    }
  },
  execute: function (forceCmd) {
    var self = this;
    var fe = focusedEditor;
    var sel_orig = "";
    if (!forceCmd && forceCmd !== "") {
      sel_orig = self.getSelection().trim() || "";
    } else {
      sel_orig = forceCmd;
    }
    var cwd_orig = self.getCwd();
    if (sel_orig) {
      var nssel = "_it_" + sel_orig;
      if (nssel in commands) {
        commands[nssel](fe.get("frame"));
      } else {
        var frame = fe.get("frame");
        var rid = frame.get("type")===PTY ? frame.getTagKey() : cwd_orig+"+REPL";
        var data = { "cmd" : sel_orig,
                     "rid" : rid,
                     "colid" : frame.get("colId"),
                     "cwd" : cwd_orig };
        post({'resource': '/x',
              'data': data,
              'success': function (xhr) {
              }});
      }
    }
  },
  newCol: function (tagKey) {
    var ids = this.get("frames").pluck("id");
    var newColId = "col" + String(_.max(ids) + 1);
    this.get("frames").add({tagKey: tagKey,
                            tag: tagKey + DEFAULTTAGNC,
                            colId: newColId
                           });
  },
  delCol: function (colId, colDomId) {
    _.forEach(this.get("frames").where({colId: colId}), function (frame) {
      frame.destroy();
    });
    $(colDomId).remove();
    var tds = $(".column");
    var ncols = tds.length;
    colwidth = $(window).width()/ncols;
    tds.width(colwidth);
    var wwidth = $(window).width();
    var dwidth = $(document).width();
    var widthdiff = (dwidth - wwidth)/ncols;
    tds.width(colwidth - widthdiff);
    //tds.width($(window).width()/tds.length);
    //$("td").width($(window).width()/tds.length);
  },
  rebalanceCol: function (wasHidden, colId, frameId) {
    /* this is horrendous, but right now it works */
    var done = false;
    vm.get("frames").forEach(function (f) {
      if (done) return;
      if (wasHidden) {
        if (f.get("colId") === colId) {
          if (f.get("visibility") !== MIN) {
            f.bigger();
            done = true;
          }
        }
      } else {
        if (f.get("colId") === colId) {
          if (f.id !== frameId) {
            f.bigger();
            done = true;
          }
        }
      }
    });
    //var frames = this.get("frames");
    //if (wasHidden) {
    //  frames.findWhere({visibility: MAX,
    //                    colId: colId}).bigger();
    //} else {
    //  frames.findWhere({visibility: MIN,
    //                    colId: colId}).bigger();
    //}
  },
  getTargetFrame: function (rid, colId, tagKey, callback) {
    var targetFrame = null;
    frames = this.get("frames");
    var existing = frames.get(rid);
    if (existing) {
      targetFrame = existing;
        callback(targetFrame);
    } else {
      var byTag = frames.findWhere({tagKey: tagKey});
      if (byTag) {
        targetFrame = byTag;
        callback(targetFrame);
      } else {
        targetFrame = frames.add({tagKey: tagKey,
                                  tag: tagKey + DEFAULTTAG,
                                  colId: colId
                                  });
        targetFrame.once("setupDone", callback);
      }
    }
    return targetFrame;
  }
});
