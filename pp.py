import os
import subprocess
from subprocess import Popen, PIPE, STDOUT

def pp_open(cmd, cwd='~/'):
    def openhelp(path):
        if os.path.exists(os.path.join(cwd, cmd)):
            if os.path.isfile(path):
                newpath = os.path.dirname(path)
                filepath = path
                return run("cat "+path, newpath), filepath, 1
            else:
                newpath = path
                return run("ls "+path, newpath), newpath, 0
        print path
        return None, cwd, 0
        
    if cmd.startswith("/"):
        return openhelp(cmd)
    return openhelp(os.path.join(cwd, cmd))

def run(cmd, cwd='~/'):
    x = Popen([cmd],
              shell=True,
              cwd=cwd,
              stderr=PIPE,
              stdout=PIPE,
              universal_newlines=True)
    output = []
    while True:
        out = x.stdout.readline()
        err = x.stderr.readline()
        if not out and not err:
            break
        if out:
            output.append(out)
        if err:
            output.append(err)
    return ''.join(output)

def put(path, content):
    f = open(path, 'w')
    f.write(content)
    f.close()
    return 1
