import os
import re
import json
import sys

# Redirect stdout to a file
sys.stdout = open('tmp/package_check_results.txt', 'w', encoding='utf-8')

def get_imports(directory, extensions):
    imports = set()
    # Updated regex to handle @scoped/packages and sub-packages
    # Handles: require('pkg'), import from 'pkg', import 'pkg'
    # Excludes: ./local, ../local
    regex = re.compile(r"(?:require|from|import)\s*\(?\s*['\"]((?![.])(?:@[^'\"/]+/[^'\"/]+|[^'\"/]+))['\"]")
    
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in dirs:
            dirs.remove('node_modules') # Skip node_modules
        for file in files:
            if any(file.endswith(ext) for ext in extensions):
                path = os.path.join(root, file)
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        matches = regex.findall(content)
                        for m in matches:
                            imports.add(m)
                except Exception as e:
                    print(f"Error reading {path}: {e}")
    return imports

def check_dir(name, path, exts):
    print(f"\n--- Checking {name} ---")
    pkg_json_path = os.path.join(path, "package.json")
    if not os.path.exists(pkg_json_path):
        print(f"No package.json found in {path}")
        return

    with open(pkg_json_path, 'r') as f:
        pkg_json = json.load(f)
    
    deps = set(pkg_json.get("dependencies", {}).keys())
    dev_deps = set(pkg_json.get("devDependencies", {}).keys())
    all_deps = deps.union(dev_deps)
    
    # Node.js built-ins
    builtins = {'fs', 'path', 'crypto', 'child_process', 'os', 'http', 'https', 'util', 'events', 'stream', 'url', 'querystring', 'zlib', 'buffer', 'string_decoder', 'tls', 'net', 'dgram', 'dns', 'v8', 'vm', 'worker_threads', 'perf_hooks', 'readline', 'repl'}
    
    src_path = os.path.join(path, "src")
    if not os.path.exists(src_path):
        src_path = path # Fallback to root if no src

    found_imports = get_imports(src_path, exts)
    
    missing = []
    for imp in found_imports:
        if imp not in all_deps and imp not in builtins:
            missing.append(imp)
    
    if missing:
        print(f"MISSING PACKAGES in {name}:")
        for m in sorted(missing):
            print(f"  - {m}")
    else:
        print(f"All used packages in {name} are listed in package.json.")

    unused = []
    # We can't easily check for unused devDeps without knowing what they are for
    for dep in deps:
        if dep not in found_imports and dep not in ["react-scripts", "web-vitals"]:
            unused.append(dep)
            
    if unused:
        print(f"POTENTIALLY UNUSED DEPENDENCIES in {name}:")
        for u in sorted(unused):
            print(f"  - {u}")

check_dir("Backend", "backend", [".js"])
check_dir("Frontend", "frontend", [".js", ".jsx"])
check_dir("Root", ".", [".js"])
