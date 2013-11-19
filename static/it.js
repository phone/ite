
$(document).ready(function () {
    TAG = 1;
    OUT = 2;
    tagopts = {"matchBrackets" : true,
               "autoCloseBrackets" : true,
               "mode" : "shell",
               "theme" : "tag",
               "indentWithTabs" : false,
               "indentUnit" : 4};
    outopts = {"matchBrackets" : true,
               "autoCloseBrackets" : true,
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
    vm.newFrame();
    ko.applyBindings(vm);
    window['vm'] = vm;
});

function Commands() {
    var self = this;
    self._it_Put = function() {
        vm.put();
    };
    self._it_New = function() {
        vm.newFrame();
    };
};

function Editor(elt, frame, id, type, options) {
    var self = this;
    this.id = id;
    this.frame = frame;
    this.isFile = false;
    this.hasTag = false;
    this.getCm = function () {
        return self.cm;
    };
    this.getDoc = function () {
        return self.cm.getDoc();
    };
    this.getTaged = function () {
        return self.frame.taged;
    };
    this.getFirstLineTokens = function () {
        var taged = self.getTaged();
        var doc = taged.getDoc();
        var tagtxt = doc.getLine(doc.firstLine());
        var tokens = tagtxt.split(" ");
        return tokens;
    };
    this.getTagKey = function () {
        return self.getFirstLineTokens()[0];
    };
    this.setTagKey = function (tagKey) {
        var tagEd = self.frame.taged;
        var tagLineIdx = tagEd.getDoc().firstLine();
        var line = tagEd.getDoc().getLine(tagLineIdx);
        var newLine = line;
        if (tagEd.hasTag) {
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
        vm.framesByTag[tagKey] = self.frame;
        if (self.frame.taged.getTagKey() !== tagKey) {
            tagEd.getDoc().setLine(tagLineIdx, newLine);
        }
        tagEd.hasTag = true;
    }
    this.getCwd = function () {
        var cwd = self.getFirstLineTokens()[0];
        if (this.isFile) {
            cwd = cwd.substring(0, cwd.lastIndexOf("/"));
        }
        return cwd;
    };
    this.setCwd = function (cwd) {
        var tokens = self.getFirstLineTokens();
        tokens[0] = cwd;
        var fl = tokens.join(" ");
        var doc = self.getTaged().getDoc();
        doc.setLine(doc.firstLine(), fl);
    };
    this.cm = CodeMirror(elt, opts[type]);
    self.cm.on("focus", function(cm) {
        vm.setFocusedEditor(self.id);
    });
    self.cm.on("mousedown", function(cm, e) {
        console.log(e);
        if (e.which === 2 || (e.which === 1 && e.altKey) || e.which === 3) {
            var pos = cm.getCursor();
            var line = cm.getLine(pos.line)
            var ctr = line[pos.ch];
            if (cm.somethingSelected()) {
                /* if something is selected, use the selection if we click inside it */
                var posidx = cm.getDoc().indexFromPos(pos);
                var existart = cm.getDoc().indexFromPos(cm.getCursor("anchor"));
                var exiend = cm.getDoc().indexFromPos(cm.getCursor("head"));
                if ((posidx >= existart && posidx <= exiend) ||
                    (posidx <= existart && posidx >= exiend)) {
                    return true;
                }
            }
            var selstart = ctr;
            var selend = ctr;
            for (var i = pos.ch;; i++) {
                console.log(i);
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
            cm.getDoc().setSelection(CodeMirror.Pos(pos.line, selstart),
                                     CodeMirror.Pos(pos.line, selend));
            console.log("attempting to bubble post sel");
        }
        return true;
    });
};

function Frame(id) {
    var self = this;
    this.idify = function (id) { return "#" + id; };
    this.id = id;
    this.editors = [];
    this.ancid = "anc" + id;
    this.tagid = "tag" + id;
    this.outid = "out" + id;
    this.taghidden = false;
    this.outhidden = false;
    this.tagHeight = function() {
        return self.taghidden ? 0 : $(self.idify(self.tagid)).height();
    };
    this.outHeight = function () {
        return self.outhidden ? 0 : $(self.idify(self.outid)).height();
    };
    this.getHeight = function() {
        var height = 0;
        height += self.taghidden ? 0 : $(self.idify(self.tagid)).height();
        height += self.outhidden ? 0 : $(self.idify(self.outid)).height();
        return height;
    };
    this.resize = function() {
       // var totalavailable = window.innerHeight;
       // var beingused = 0;
       // for (var i = 0; i < vm.frames.length; i++) {
       //     var fr = vm.frames[i];
       //     if (fr.id === self.id) continue;
       //     beingused += fr.getHeight();
       // };
       // beingused += self.tagHeight();
       // console.log(totalavailable - beingused);
       // var outedHeight = totalavailable - beingused;
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
        self.outhidden = true;
        $(self.idify(self.outid)).hide();
        $(self.idify(self.ancid)).removeClass("anchor-focused").addClass("anchor");
    };
    this.hideOthers = function() {
        for (i = 0; i < vm.frames.length; i++) {
            var fr = vm.frames[i];
            if (fr.id === self.id || fr.outhidden) continue;
            fr.minimize();
        };
    };
    this.bigger = function() {
        self.hideOthers();
        self.outhidden = false;
        $(self.idify(self.outid)).show();
        self.resize();
    };
    $("#top").append("<div id=\""+self.id+"\"> \n" +
                     "  <span class=\"anchor\" id=\""+self.ancid+"\">&nbsp;&nbsp;&nbsp;&nbsp;</span>\n" +
                     "  <div class=\"tag\" id=\""+self.tagid+"\"></div> \n" +
                     "  <div id=\""+self.outid+"\"></div> \n" +
                     "</div>");
    
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
    this.frames = [];
    this.framesByTag = {};
    this.cols = 1;
    this.colwidth = $(document).width();
    this.commands = new Commands();
    this.editors = {};
    this.maxid = 0;
    this.focusedEditor = null;
    this.setFocusedEditor = function(id) {
        self.focusedEditor = self.editors[id];
    };
    this.get_cwd = function() {
        return self.focusedEditor.getCwd();
    };
    this.get_selection = function() {
        if (self.focusedEditor.cm.somethingSelected()) {
            return self.focusedEditor.cm.getSelection() || "";
        }
        return "";
    };
    this.put = function() {
        var fe = self.focusedEditor;
        var path = fe.getTagKey();
        var content = fe.frame.outed.getDoc().getValue();
        var data = { "path" : path, "content": content };
        post({'resource': '/put',
              'data': data,
              'success' : function (xhr) {
                  fe.setTagKey(path);
                  fe.hasTag = true;
                  return true;
              }});
    };
    this.open = function() {
        var fe = self.focusedEditor;
        var orig_sel = self.get_selection().trim() || "";
        var orig_cwd = self.get_cwd();
        if (orig_sel) {
            var data = { "cmd" : orig_sel,
                         "cwd" : orig_cwd };
            post({'resource': '/o',
                  'data': data,
                  'success': function (xhr) {
                      if (!fe.frame.taged.hasTag) {
                          fe.frame.taged.setTagKey(orig_sel);
                      }
                      var output = xhr.output;
                      var cwd = xhr.cwd;
                      var type = xhr.type;
                      var targetFrame = null;
                      if (_.has(self.framesByTag, cwd)) {
                          targetFrame = self.framesByTag[cwd];
                      } else {
                          targetFrame = self.newFrame(cwd);
                      }
                      targetFrame.outed.getDoc().setValue(output);
//                      targetFrame.taged.setCwd(cwd);
                      if (type === 1) {
                          targetFrame.taged.isFile = true;
                          targetFrame.outed.isFile = true;
                          var ext = cwd.substring(cwd.split(" ")[0].lastIndexOf(".")+1);
                          var mode = modes[ext];
                          if (mode) {
                              targetFrame.outed.cm.setOption("mode", mode);
                          }
                      } else {
                          targetFrame.outed.cm.setOption("mode", "shell");
                          targetFrame.taged.isFile = false;
                          targetFrame.outed.isFile = false;
                      }
                      if (targetFrame.outhidden) {
                          targetFrame.bigger();
                      }
                  }});
        }};
    this.execute = function() {
        var fe = self.focusedEditor;
        var sel_orig = self.get_selection().trim() || "";
        var cwd_orig = self.get_cwd();
        if (sel_orig) {
            var nssel = "_it_" + sel_orig;
            if (nssel in self.commands) {
                self.commands[nssel]();
            } else {
                console.log("posting");
                var data = { "cmd" : sel_orig,
                             "cwd" : cwd_orig };
                post({'resource': '/x',
                      'data': data,
                      'success': function (xhr) {
                          var cwd = cwd_orig + "+Output";
                          if (!fe.frame.taged.hasTag) {
                              fe.frame.taged.setTagKey(cwd);
                          }
                          var output = xhr.output;
                          var targetFrame = null;
                          if (_.has(self.framesByTag, cwd)) {
                              targetFrame = self.framesByTag[cwd];
                          } else {
                              targetFrame = self.newFrame(cwd);
                          }
                          targetFrame.outed.getDoc().setValue(output);
                      }});
            }
        }};
    this.newFrame = function(tagKey) {
        var f = new Frame(self.maxid++);
        for (var i = 0; i < f.editors.length; i++) {
            var eid = f.editors[i].id;
            self.editors[eid] = f.editors[i];
        }
        self.frames.push(f);
        if (tagKey) {
            f.taged.setTagKey(tagKey)
            self.framesByTag[tagKey] = f;
        }
        return f;
    };
    $("#top").on("contextmenu", function(e) {
        if (e.target.className === "anchor") {
            self.frames[parseInt($(e.target.parentNode).attr("id"))].bigger();
        } else {
            self.open();
        }
        return false;
    });
    $("#top").mouseup(function(x) {
        if (x.which === 2 || (x.which === 1 && x.altKey)) {
            self.execute();
        }
        return true;
    });
};

/*    this.tag = CodeMirror(tag1);
    this.tag.setSize(self.colwidth,"auto");
    this.tag.setOption("matchBrackets", true);
    this.tag.setOption("autoCloseBrackets", true);
    //this.tag.setOption("keyMap", "vim");
    this.tag.setOption("mode", "python");
    this.tag.setOption("theme", "tag");
    this.tag.setOption("indentWithTabs", false);
    this.tag.setOption("indentUnit", 4);

    this.out = CodeMirror(out1);
    this.out.setSize(self.colwidth,500);
    this.out.setOption("matchBrackets", true);
    this.out.setOption("autoCloseBrackets", true);
*/
