from flask import Flask
from flask import session
from flask import redirect
from flask import url_for
from flask import render_template
from flask import request
from flask import jsonify

import re
import json
import pp

app = Flask(__name__)
app.secret_key = 'b\xa7\x9b\x87\xedR\xd3\xbe\x01{\xb4\x15XK\xc7\xce\x06\x81\xc6\x17\xb7}dZ'


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/o', methods=['POST'])
def open():
    cwd = request.get_json()['cwd']
    cmd = request.get_json()['cmd']
    ret, cwd, type = pp.pp_open(cmd, cwd)
    return jsonify({'output':unicode(ret),
                    'cwd':unicode(cwd),
                    'type':type})

@app.route('/x', methods=['POST'])
def execute():
    cwd = request.get_json()['cwd']
    cmd = request.get_json()['cmd']
    ret = unicode(pp.run(cmd, cwd))
    return jsonify({'output': ret})

@app.route('/put', methods=['POST'])
def put():
    path = request.get_json()['path']
    content = request.get_json()['content']
    status = pp.put(path, content)
    return jsonify({'status':status})

if __name__ == "__main__":
    app.debug=True
    app.run(host='0.0.0.0')

