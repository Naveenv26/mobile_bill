# Number of worker processes
workers = 3

# Worker class
worker_class = "sync"

# Bind
bind = "0.0.0.0:8000"

# Timeout
timeout = 120

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"

# Restart workers after this many requests (prevent memory leaks)
max_requests = 1000
max_requests_jitter = 100