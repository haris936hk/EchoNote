import os
import re
import json

def get_package_json_deps(path):
    pkg_json_path = os.path.join(path, "package.json")
    if not os.path.exists(pkg_json_path):
        return set()
    with open(pkg_json_path, 'r') as f:
        pkg_json = json.load(f)
    deps = set(pkg_json.get("dependencies", {}).keys())
    dev_deps = set(pkg_json.get("devDependencies", {}).keys())
    return deps.union(dev_deps)

def get_used_packages(directory, extensions):
    used = set()
    # Regex to find imports/requires
    # Handles: import ... from 'pkg', require('pkg'), import('pkg'), from 'pkg/sub'
    # Captures the root package name (including scoped packages)
    regex = re.compile(r"(?:import|from|require)\s*\(?\s*['\"]((?:@[^'\"/]+/[^'\"/]+)|(?:[^'\"/.][^'\"/]*))")
    
    builtins = {'fs', 'path', 'crypto', 'child_process', 'os', 'http', 'https', 'util', 'events', 'stream', 'url', 'querystring', 'zlib', 'buffer', 'string_decoder', 'tls', 'net', 'dgram', 'dns', 'v8', 'vm', 'worker_threads', 'perf_hooks', 'readline', 'repl', 'assert', 'timers', 'cluster', 'dns/promises', 'fs/promises'}

    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules')
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        for line in f:
                            matches = regex.findall(line)
                            for m in matches:
                                pkg = m.split('/')[0] if not m.startswith('@') else '/'.join(m.split('/')[:2])
                                if pkg and pkg not in builtins:
                                    used.add(pkg)
                except:
                    pass
    return used

def check(name, path, exts):
    print(f"\n--- {name} ---")
    deps = get_package_json_deps(path)
    src_path = os.path.join(path, "src") if os.path.exists(os.path.join(path, "src")) else path
    used = get_used_packages(src_path, exts)
    
    missing = used - deps
    unused = deps - used - {"react-scripts", "web-vitals", "concurrently"}
    
    if missing:
        print(f"MISSING (Used but not in package.json):")
        for m in sorted(missing):
            print(f"  - {m}")
    else:
        print("All used packages are listed in package.json.")
        
    if unused:
        print(f"POTENTIALLY UNUSED (In package.json but not found in src):")
        for u in sorted(unused):
            print(f"  - {u}")

# Set stdout to file
import sys
sys.stdout = open('tmp/package_report.txt', 'w', encoding='utf-8')

check("Backend", "backend", [".js"])
check("Frontend", "frontend", [".js", ".jsx"])
check("Root", ".", [".js", ".jsx"])
