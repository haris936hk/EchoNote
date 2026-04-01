import sys
import os
import json
import logging

def main():
    print("Normal python print", file=sys.stdout)
    os.system('echo "C level print"')
    
    # Now with os-level redirection
    print("Redirecting FD 1 to devnull...", file=sys.stderr)
    devnull_fd = os.open(os.devnull, os.O_WRONLY)
    original_stdout_fd = os.dup(1)
    os.dup2(devnull_fd, 1)
    
    print("This python print is hidden", file=sys.stdout)
    os.system('echo "This C-level print is hidden too!!"')
    
    # Restore stdout
    os.dup2(original_stdout_fd, 1)
    os.close(original_stdout_fd)
    os.close(devnull_fd)
    
    print(json.dumps({"success": True}))

if __name__ == "__main__":
    main()
